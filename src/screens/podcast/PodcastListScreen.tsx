import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { useRadioStore } from '../../store/radioStore';
import { getYouTubeWatchUrl } from '../../services/api';
import { useVideoPosts } from '../../services/queries';
import { usePodcastShowList } from '../../services/podcastQueries';
import { VideoPost } from '../../types';
import { PodcastShow } from '../../types/podcast';

/**
 * Podcast tab landing screen. Matches the web nav dropdown's structure
 * (PodcastNavDropdown in the web app): a category list built from
 * usePodcastShowList() - the distinct shows derived from recent episode
 * pages - plus an "All Podcast" entry. Tapping a category drills into that
 * show's episodes (PodcastShowScreen); tapping "All Podcast" opens the flat
 * global feed (PodcastAllEpisodesScreen). This replaces an earlier version
 * of this screen that showed a flat "Recent Episodes" list directly here,
 * which wasn't what the web version does.
 */

interface ResolvedNavChild {
    label: string;
    slug: string;
  }

export default function PodcastListScreen({ navigation }: any) {
  const { playbackState, nowPlaying, playLive } = useRadioStore();
  const { data: videos = [], isLoading: videosLoading } = useVideoPosts();
  const {
    data: shows,
    isLoading: showsLoading,
    isError: showsError,
    error: showsErrorObj,
    refetch: refetchShows,
  } = usePodcastShowList();

  

  const isLiveActive = nowPlaying?.isLive && playbackState !== 'stopped';

  const openVideo = (video: VideoPost) => {
    Linking.openURL(getYouTubeWatchUrl(video.videoId)).catch(() => {});
  };

  console.log("PODCASTS: ", shows)

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={shows ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.categoryRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.screenTitle}>Podcast</Text>
              <Text style={styles.screenSubtitle}>
                Missed a broadcast? Catch up on past shows and news bulletins here.
              </Text>
            </View>

            <Pressable
              style={styles.liveCard}
              onPress={() => {
                if (!isLiveActive) playLive();
                navigation.navigate('NowPlaying');
              }}
            >
              <View style={styles.liveCardLeft}>
                <View style={styles.pulseDot} />
                <View>
                  <Text style={styles.liveLabel}>LIVE NOW</Text>
                  <Text style={styles.liveTitle}>GhanaTalksRadio Broadcast</Text>
                </View>
              </View>
              {playbackState === 'loading' ? (
                <ActivityIndicator color={COLORS.onPrimary} />
              ) : (
                <Ionicons
                  name={isLiveActive && playbackState === 'playing' ? 'pause-circle' : 'play-circle'}
                  size={40}
                  color={COLORS.onPrimary}
                />
              )}
            </Pressable>

            <Text style={styles.sectionTitle}>Watch</Text>
            {videosLoading ? (
              <ActivityIndicator style={{ marginLeft: SPACING.md }} color={COLORS.secondary} />
            ) : videos.length === 0 ? (
              <Text style={[styles.emptyText, { marginHorizontal: SPACING.md }]}>
                No videos available right now.
              </Text>
            ) : (
              <FlatList
                horizontal
                data={videos}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.videoRow}
                renderItem={({ item }) => (
                  <Pressable style={styles.videoCard} onPress={() => openVideo(item)}>
                    <View>
                      <Image source={{ uri: item.thumbnail }} style={styles.videoThumb} />
                      <View style={styles.playOverlay}>
                        <Ionicons name="play-circle" size={36} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </Pressable>
                )}
              />
            )}

            <Text style={styles.sectionTitle}>Categories</Text>

            {/* "All Podcast" - matches the web nav dropdown's first entry
                alongside the per-show categories. */}
            <Pressable
              style={styles.allPodcastTile}
              onPress={() => navigation.navigate('PodcastAllEpisodes')}
            >
              <View style={styles.allPodcastIcon}>
                <Ionicons name="apps" size={20} color={COLORS.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.allPodcastTitle}>All Podcast</Text>
                <Text style={styles.allPodcastSubtitle}>Every episode, every show</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
            </Pressable>

            {showsLoading && (
              <ActivityIndicator style={{ marginTop: SPACING.md }} color={COLORS.secondary} />
            )}
          </View>
        }
        ListEmptyComponent={
          showsError ? (
            <View style={styles.errorBox}>
              <Ionicons name="cloud-offline-outline" size={28} color={COLORS.outline} />
              <Text style={styles.emptyText}>Couldn't load podcast categories.</Text>
              <Text style={styles.errorDetail} numberOfLines={2}>
                {showsErrorObj instanceof Error ? showsErrorObj.message : 'Unknown error'}
              </Text>
              <Pressable style={styles.retryButton} onPress={() => refetchShows()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : !showsLoading ? (
            <Text style={styles.emptyText}>No podcast categories found yet.</Text>
          ) : null
        }
        renderItem={({ item }: { item: PodcastShow }) => (
          <Pressable
            style={styles.categoryCard}
            onPress={() => navigation.navigate('PodcastShow', { showSlug: item.slug })}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.categoryArtwork} />
            ) : (
              <View style={[styles.categoryArtwork, styles.categoryArtworkFallback]}>
                <Ionicons name="mic" size={28} color={COLORS.outline} />
              </View>
            )}
            <Text style={styles.categoryName} numberOfLines={2}>
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  header: { padding: SPACING.md, gap: 4 },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  screenSubtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },
  liveCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  liveCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.onTertiaryContainer,
  },
  liveLabel: { color: COLORS.outlineVariant, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  liveTitle: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  videoRow: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  videoCard: { width: 160 },
  videoThumb: { width: 160, height: 96, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceContainer },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: { fontSize: 12, fontWeight: '600', color: COLORS.onSurface, marginTop: 6 },
  allPodcastTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  allPodcastIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allPodcastTitle: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  allPodcastSubtitle: { fontSize: 12, color: COLORS.onSurfaceVariant },
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg },
  categoryRow: { gap: SPACING.sm },
  categoryCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: 6,
  },
  categoryArtwork: { width: '100%', aspectRatio: 1.4, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceContainer },
  categoryArtworkFallback: { alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface },
  emptyText: { color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.lg },
  errorBox: { alignItems: 'center', gap: 6, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg },
  errorDetail: { color: COLORS.outline, fontSize: 11, textAlign: 'center' },
  retryButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: RADIUS.sm,
  },
  retryText: { color: COLORS.onPrimary, fontWeight: '600', fontSize: 13 },
});
