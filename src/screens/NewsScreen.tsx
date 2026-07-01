import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Badge } from '../components/UI';
import { ShareBar } from '../components/ShareBar';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { useNewsFeed, useCategories } from '../services/queries';
import { Article } from '../types';

export default function NewsScreen({ navigation }: any) {
  const user = useUserStore((s) => s.user);
  const toggleBookmark = useUserStore((s) => s.toggleBookmark);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  // Likes aren't a real WordPress concept (no comments/likes endpoint was found
  // in the backend audit) - kept as a local, cosmetic counter like the original
  // Stitch prototype's isLikedMap.
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});

  const { data: categories } = useCategories();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNewsFeed(selectedCategoryId);

  const articles = data?.articles ?? [];
  const breaking = !selectedCategoryId ? articles.find((a) => a.isBreaking) : undefined;
  const listArticles = breaking ? articles.filter((a) => a.id !== breaking.id) : articles;

  const handleBookmark = (articleId: string) => {
    if (!user) {
      navigation.navigate('AuthModal', { screen: 'Login' });
      return;
    }
    toggleBookmark(articleId);
  };

  const handleLike = (articleId: string) => {
    setLocalLikes((prev) => ({ ...prev, [articleId]: (prev[articleId] ?? 0) + 1 }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.flex, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.flex, styles.centered]}>
        <Ionicons name="cloud-offline-outline" size={40} color={COLORS.outline} />
        <Text style={styles.errorText}>Couldn't load news right now.</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={listArticles}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isRefetching}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: SPACING.lg }} color={COLORS.secondary} />
          ) : null
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.screenTitle}>News</Text>

            {!user && (
              <Pressable
                style={styles.guestBanner}
                onPress={() => navigation.navigate('AuthModal', { screen: 'Login' })}
              >
                <Ionicons name="person-circle-outline" size={20} color={COLORS.onSecondaryContainer} />
                <Text style={styles.guestBannerText}>
                  Sign in to save articles, earn points, and enter raffles
                </Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.onSecondaryContainer} />
              </Pressable>
            )}

            {breaking && (
              <Pressable style={styles.breakingCard} onPress={() => setActiveArticle(breaking)}>
                <Image source={{ uri: breaking.image }} style={styles.breakingImage} />
                <View style={styles.breakingOverlay}>
                  <Badge text="Breaking" variant="breaking" />
                  <Text style={styles.breakingTitle} numberOfLines={3}>
                    {breaking.title}
                  </Text>
                </View>
              </Pressable>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              <Pressable
                onPress={() => setSelectedCategoryId(undefined)}
                style={[styles.categoryChip, !selectedCategoryId && styles.categoryChipActive]}
              >
                <Text
                  style={[styles.categoryChipText, !selectedCategoryId && styles.categoryChipTextActive]}
                >
                  For You
                </Text>
              </Pressable>
              {(categories ?? []).map((cat: { id: number; name: string }) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={[
                    styles.categoryChip,
                    selectedCategoryId === cat.id && styles.categoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategoryId === cat.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {listArticles.length === 0 && (
              <Text style={styles.emptyText}>No articles in this category yet.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            isBookmarked={!!user?.bookmarkedArticleIds.includes(item.id)}
            onPress={() => setActiveArticle(item)}
            onBookmark={() => handleBookmark(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={!!activeArticle}
        animationType="slide"
        onRequestClose={() => setActiveArticle(null)}
      >
        {activeArticle && (
          <ArticleDetail
            article={activeArticle}
            likeCount={activeArticle.likes + (localLikes[activeArticle.id] ?? 0)}
            isBookmarked={!!user?.bookmarkedArticleIds.includes(activeArticle.id)}
            onClose={() => setActiveArticle(null)}
            onLike={() => handleLike(activeArticle.id)}
            onBookmark={() => handleBookmark(activeArticle.id)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function ArticleCard({
  article,
  isBookmarked,
  onPress,
  onBookmark,
}: {
  article: Article;
  isBookmarked: boolean;
  onPress: () => void;
  onBookmark: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: article.image }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardCategory}>{article.category.toUpperCase()}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={styles.cardExcerpt} numberOfLines={2}>
          {article.excerpt}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>
            {article.author} · {article.readTime}
          </Text>
          <Pressable onPress={onBookmark} hitSlop={10}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isBookmarked ? COLORS.secondary : COLORS.onSurfaceVariant}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function ArticleDetail({
  article,
  likeCount,
  isBookmarked,
  onClose,
  onLike,
  onBookmark,
}: {
  article: Article;
  likeCount: number;
  isBookmarked: boolean;
  onClose: () => void;
  onLike: () => void;
  onBookmark: () => void;
}) {
  return (
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
        <Text style={styles.detailBody}>{article.content}</Text>
        <ShareBar url={article.link} title={article.title} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  centered: { alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  errorText: { color: COLORS.onSurfaceVariant, fontSize: 14 },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.sm,
  },
  retryText: { color: COLORS.onPrimary, fontWeight: '600' },
  listContent: { padding: SPACING.md, gap: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface, marginBottom: SPACING.md },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  guestBannerText: {
    flex: 1,
    color: COLORS.onSecondaryContainer,
    fontSize: 12,
    fontWeight: '600',
  },
  breakingCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    height: 200,
  },
  breakingImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  breakingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.55)',
    justifyContent: 'flex-end',
    padding: SPACING.md,
    gap: 8,
  },
  breakingTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  categoryRow: { gap: 8, paddingBottom: SPACING.md },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceContainer,
  },
  categoryChipActive: { backgroundColor: COLORS.secondaryContainer },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  categoryChipTextActive: { color: COLORS.onSecondaryContainer },
  emptyText: { color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.lg },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  cardImage: { width: '100%', height: 160 },
  cardBody: { padding: SPACING.md, gap: 6 },
  cardCategory: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.5 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface },
  cardExcerpt: { fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  cardMeta: { fontSize: 12, color: COLORS.outline },
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
  detailBody: { fontSize: 16, lineHeight: 26, color: COLORS.onSurface, textAlign: 'justify' },
});
