import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { usePodcastEpisodes } from '../../services/podcastQueries';
import { PodcastEpisode } from '../../types/podcast';
import { PodcastEpisodeCard } from '../../components/PodcastEpisodeCard';
import { Pagination } from '../../components/Pagination';
import { BannerAdSlot } from '../../components/ads/BannerAdSlot';
import { withAds } from '../../utils/adFeed';

// One banner ad every 4 episodes (10 episodes/page), matching the
// in-feed ad cadence used for the News list.
const AD_INTERVAL = 4;

/**
 * Flat global episode feed across every show, matching the web version's
 * base /podcast route (Podcast.tsx). Reached from the "All Podcast" tile
 * on the category list, same as the web nav dropdown's "All Podcast" entry
 * sitting alongside the per-show categories.
 */
export default function PodcastAllEpisodesScreen({ navigation }: any) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = usePodcastEpisodes(page);

  const episodes = data?.episodes ?? [];
  const knownTotalPages = data?.hasMore ? page + 1 : page;
  const feedItems = withAds<PodcastEpisode>(episodes, AD_INTERVAL);

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={feedItems}
        keyExtractor={(item) => (item.kind === 'item' ? item.item.id : item.key)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={16} color={COLORS.onSurfaceVariant} />
              <Text style={styles.backLinkText}>Back to Categories</Text>
            </Pressable>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>CATCH UP</Text>
              <Text style={styles.screenTitle}>All Podcast</Text>
              <Text style={styles.screenSubtitle}>
                Missed a broadcast? Catch up on past shows and news bulletins here.
              </Text>
            </View>
            {isLoading && !data && (
              <ActivityIndicator style={{ marginTop: SPACING.sm }} color={COLORS.secondary} />
            )}
          </View>
        }
        ListFooterComponent={
          episodes.length > 0 ? (
            <Pagination page={page} totalPages={knownTotalPages} onPageChange={setPage} />
          ) : null
        }
        ListEmptyComponent={
          isError ? (
            <View style={styles.stateBox}>
              <Ionicons name="cloud-offline-outline" size={28} color={COLORS.outline} />
              <Text style={styles.stateText}>
                Couldn't load episodes right now{error instanceof Error ? `: ${error.message}` : '.'}
              </Text>
              <Pressable style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : !isLoading ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>No episodes here yet — check back soon.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.sm }}>
            {item.kind === 'ad' ? <BannerAdSlot /> : <PodcastEpisodeCard episode={item.item} />}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { paddingBottom: SPACING.lg },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: SPACING.md, paddingBottom: 0 },
  backLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  header: { padding: SPACING.md, gap: 4 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.6 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  screenSubtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },
  stateBox: { alignItems: 'center', gap: 8, padding: SPACING.xl },
  stateText: { color: COLORS.onSurfaceVariant, textAlign: 'center', fontSize: 14 },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: RADIUS.sm,
  },
  retryText: { color: COLORS.onPrimary, fontWeight: '600', fontSize: 13 },
});
