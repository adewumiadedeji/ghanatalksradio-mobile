import React, { useState } from 'react';
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
import { usePodcastShowEpisodes } from '../../services/podcastQueries';
import { PodcastEpisode } from '../../types/podcast';
import { PodcastEpisodeCard } from '../../components/PodcastEpisodeCard';
import { Pagination } from '../../components/Pagination';
import { getAvailablePlatformLinks } from '../../utils/podcastPlatforms';
import { BannerAdSlot } from '../../components/ads/BannerAdSlot';
import { withAds } from '../../utils/adFeed';

// One banner ad every 4 episodes (10 episodes/page), matching the
// in-feed ad cadence used for the News list.
const AD_INTERVAL = 4;

/**
 * Show archive screen (PodcastShow route param: showSlug) - every episode
 * for one show. Ported from PodcastShow.tsx. Confirmed live on the web
 * rebuild: shows are identified by their own slug, distinct from individual
 * episode slugs, and there's no per-show filter on the API - episodes are
 * found by walking the global listing client-side (see podcastApi.ts).
 */
export default function PodcastShowScreen({ route, navigation }: any) {
  const { showSlug } = route.params as { showSlug: string };
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = usePodcastShowEpisodes(showSlug, page);

  const show = data?.show ?? null;
  const episodes = data?.episodes ?? [];
  const knownTotalPages = data?.hasMore ? page + 1 : page;
  const platformLinks = show ? getAvailablePlatformLinks(show.external as any) : [];
  const feedItems = withAds<PodcastEpisode>(episodes, AD_INTERVAL);

  if (isLoading && !data) {
    return (
      <SafeAreaView style={[styles.flex, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </SafeAreaView>
    );
  }

  if (!isLoading && !show) {
    return (
      <SafeAreaView style={styles.flex}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={COLORS.onSurfaceVariant} />
          <Text style={styles.backLinkText}>Back to Podcast</Text>
        </Pressable>
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>
            {data?.searchExhausted
              ? "This show wasn't found in recent broadcasts. It may be older than what's currently searchable."
              : "This show doesn't exist or may have been removed."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
              <Text style={styles.backLinkText}>Back to Podcast</Text>
            </Pressable>

            {show && (
              <View style={styles.showHeader}>
                {show.imageUrl && <Image source={{ uri: show.imageUrl }} style={styles.showArtwork} />}
                <View style={styles.showHeaderBody}>
                  <Text style={styles.showEyebrow}>SHOW</Text>
                  <Text style={styles.showName}>{show.name}</Text>
                  {platformLinks.length > 0 && (
                    <View style={styles.platformRow}>
                      {platformLinks.map((link) => (
                        <Pressable
                          key={link.key}
                          style={styles.platformPill}
                          onPress={() => Linking.openURL(link.url).catch(() => {})}
                        >
                          <Ionicons name={link.icon} size={13} color={link.accent} />
                          {/* <Text style={styles.platformPillText}>{link.label}</Text> */}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
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
  centered: { alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: SPACING.lg },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: SPACING.md,
  },
  backLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  showHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  showArtwork: { width: 72, height: 72, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceContainer },
  showHeaderBody: { flex: 1, gap: 4 },
  showEyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.6 },
  showName: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceContainer,
  },
  platformPillText: { fontSize: 11, fontWeight: '600', color: COLORS.onSurface },
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
