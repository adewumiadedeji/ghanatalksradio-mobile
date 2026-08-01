import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RenderHtml, {
  HTMLElementModel,
  HTMLContentModel,
  CustomBlockRenderer,
} from 'react-native-render-html';
import { Badge } from './UI';
import { ShareBar } from './ShareBar';
import { BannerAdSlot } from './ads/BannerAdSlot';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { Article } from '../types';

interface ArticleDetailModalProps {
  article: Article | null;
  likeCount: number;
  isBookmarked: boolean;
  onClose: () => void;
  onLike: () => void;
  onBookmark: () => void;
}

// WordPress's `the_content` filter already turns a pasted YouTube URL into a
// real <iframe src="https://www.youtube.com/embed/VIDEO_ID">, so this only
// needs to recognize the handful of URL shapes YouTube itself uses.
function extractYouTubeId(src: string): string | null {
  const patterns = [
    /(?:youtube(?:-nocookie)?\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = src.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const customHTMLElementModels = {
  iframe: HTMLElementModel.fromCustomModel({
    tagName: 'iframe',
    contentModel: HTMLContentModel.block,
  }),
};

const YoutubeEmbedRenderer: CustomBlockRenderer = ({ tnode }) => {
  const navigation = useNavigation<any>();
  const src: string | undefined = (tnode.attributes as Record<string, string>)?.src;
  const videoId = src ? extractYouTubeId(src) : null;

  // Not a YouTube embed (rare on this site) - nothing safe to render inline.
  if (!videoId) return null;

  return (
    <Pressable
      style={embedStyles.wrap}
      onPress={() => navigation.navigate('YoutubeVideo', { videoId, title: 'Video' })}
    >
      <Image
        source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
        style={embedStyles.thumb}
      />
      <View style={embedStyles.playOverlay}>
        <Ionicons name="play-circle" size={48} color="#fff" />
      </View>
    </Pressable>
  );
};

export function ArticleDetailModal({
  article,
  likeCount,
  isBookmarked,
  onClose,
  onLike,
  onBookmark,
}: ArticleDetailModalProps) {
  const { width } = useWindowDimensions();

  return (
    <Modal visible={!!article} animationType="slide" onRequestClose={onClose}>
      {article && (
        <SafeAreaView style={styles.flex}>
          <View style={styles.detailHeader}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={26} color={COLORS.onSurface} />
            </Pressable>
            <View style={styles.detailHeaderActions}>
              <Pressable onPress={onLike} hitSlop={10} style={styles.detailIconButton}>
                <Ionicons name="heart-outline" size={22} color={COLORS.onSurface} />
                <Text style={styles.detailIconLabel}>{likeCount}</Text>
              </Pressable>
              <Pressable onPress={onBookmark} hitSlop={10}>
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isBookmarked ? COLORS.secondary : COLORS.onSurface}
                />
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.detailContent}>
            {article.isBreaking && <Badge text="Breaking" variant="breaking" />}
            <Text style={styles.detailTitle}>{article.title}</Text>
            <Text style={styles.detailMeta}>
              By {article.author} · {article.date} · {article.readTime}
            </Text>
            <Image source={{ uri: article.image }} style={styles.detailImage} />
            <RenderHtml
              contentWidth={width - SPACING.md * 2}
              source={{ html: article.content }}
              customHTMLElementModels={customHTMLElementModels}
              renderers={{ iframe: YoutubeEmbedRenderer }}
              baseStyle={styles.htmlBase}
              tagsStyles={htmlTagStyles}
            />
            <BannerAdSlot />
            <ShareBar url={article.link} title={article.title} />
          </ScrollView>
        </SafeAreaView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  detailHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  detailIconButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailIconLabel: { fontSize: 13, color: COLORS.onSurface },
  detailContent: { padding: SPACING.md, gap: SPACING.md },
  detailTitle: { fontSize: 26, fontWeight: '700', color: COLORS.onSurface, lineHeight: 32 },
  detailMeta: { fontSize: 13, color: COLORS.onSurfaceVariant },
  detailImage: { width: '100%', height: 220, borderRadius: RADIUS.lg },
  htmlBase: { fontSize: 16, lineHeight: 26, color: COLORS.onSurface },
});

const htmlTagStyles = {
  img: { borderRadius: RADIUS.md },
  a: { color: COLORS.secondary },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
    paddingLeft: SPACING.md,
    fontStyle: 'italic' as const,
  },
};

const embedStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  thumb: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
