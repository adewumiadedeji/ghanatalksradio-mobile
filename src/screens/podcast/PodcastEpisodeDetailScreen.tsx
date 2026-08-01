import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { usePodcastEpisode } from '../../services/podcastQueries';
import { useRadioStore } from '../../store/radioStore';
import { formatEpisodeDate, formatEpisodeTimeRange } from '../../utils/podcastContent';
import { getAvailablePlatformLinks } from '../../utils/podcastPlatforms';

/**
 * Episode detail screen for a route like /podcast/time-with-koo-ntakra/gambling.
 * Ported from PodcastEpisodeDetail.tsx. There's no direct single-episode API
 * endpoint - usePodcastEpisode pages through the listing under the hood to
 * find a match (bounded search, see podcastApi.ts).
 *
 * Play routes through this app's existing shared player (radioStore +
 * Now Playing screen) rather than a separate inline <audio> element, since
 * the web version's per-page audio tag has no lightweight RN equivalent and
 * this app already has one consistent audio engine for live + episodes.
 */
export default function PodcastEpisodeDetailScreen({ route, navigation }: any) {
  const { showSlug, episodeSlug } = route.params as { showSlug: string; episodeSlug: string };
  const { data, isLoading, isError } = usePodcastEpisode(showSlug, episodeSlug);
  const { playPodcastEpisode, playbackState, nowPlaying } = useRadioStore();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.flex, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </SafeAreaView>
    );
  }

  if (isError || !data?.episode) {
    return (
      <SafeAreaView style={styles.flex}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={COLORS.onSurfaceVariant} />
          <Text style={styles.backLinkText}>Back to Podcast</Text>
        </Pressable>
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>
            {data?.searchExhausted
              ? "This episode wasn't found in recent broadcasts. It may be older than what's currently searchable."
              : "This episode doesn't exist or may have been removed."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const episode: any = data.episode;
  const timeRange = formatEpisodeTimeRange(episode.startDate, episode.endDate);
  // Show-level external links carry the real platform URLs on this backend;
  // episode-level external was empty on every confirmed sample.
  const platformLinks = getAvailablePlatformLinks(episode.show.external);

  const isThisPlaying = nowPlaying?.id === `episode-${episode.id}` && playbackState === 'playing';

  const handlePlay = () => {
    if (!episode.audioUrl) return;
    playPodcastEpisode(episode);
    navigation.navigate('NowPlaying');
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={COLORS.onSurfaceVariant} />
          <Text style={styles.backLinkText}>Back to Podcast</Text>
        </Pressable>

        <View style={styles.hero}>
          {episode.show.imageUrl && (
            <Image source={{ uri: episode.show.imageUrl }} style={styles.artwork} />
          )}
          <View style={styles.heroBody}>
            <Pressable
              onPress={() => navigation.navigate('PodcastShow', { showSlug: episode.show.slug })}
            >
              <Text style={styles.showEyebrow}>{episode.show.name.toUpperCase()}</Text>
            </Pressable>
            <Text style={styles.title}>{episode.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{formatEpisodeDate(episode.startDate)}</Text>
              {!!timeRange && (
                <>
                  <Text style={styles.meta}>·</Text>
                  <Text style={styles.meta}>{timeRange}</Text>
                </>
              )}
            </View>

            {episode.audioUrl ? (
              <Pressable style={styles.playButton} onPress={handlePlay}>
                <Ionicons
                  name={isThisPlaying ? 'pause' : 'play'}
                  size={15}
                  color={isThisPlaying ? COLORS.onPrimary : COLORS.onSecondary}
                />
                <Text style={styles.playButtonText}>
                  {isThisPlaying ? 'Pause episode' : 'Play episode'}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.unavailableNote}>Audio isn't available for this episode.</Text>
            )}
          </View>
        </View>

        {!!episode.description && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>ABOUT THIS EPISODE</Text>
            <Text style={styles.description}>{episode.description}</Text>
          </View>
        )}

        {platformLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>LISTEN ON</Text>
            <View style={styles.platformGrid}>
              {platformLinks.map((link) => (
                <Pressable
                  key={link.key}
                  style={styles.platformLink}
                  onPress={() => Linking.openURL(link.url).catch(() => {})}
                >
                  <Ionicons name={link.icon} size={20} color={link.accent} />
                  <Text style={styles.platformLinkText}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: SPACING.xl },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: SPACING.md,
  },
  backLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  hero: {
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  artwork: { width: '100%', aspectRatio: 1.6, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceContainer },
  heroBody: { gap: 6 },
  showEyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.6 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.onSurface, lineHeight: 28 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  meta: { fontSize: 12, color: COLORS.outline },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
  playButtonText: { color: COLORS.onSecondary, fontWeight: '700', fontSize: 14 },
  unavailableNote: { fontSize: 13, fontStyle: 'italic', color: COLORS.outline, marginTop: SPACING.sm },
  section: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionHeading: { fontSize: 11, fontWeight: '700', color: COLORS.outline, letterSpacing: 0.6 },
  description: { fontSize: 15, lineHeight: 24, color: COLORS.onSurface },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  platformLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    minWidth: 140,
  },
  platformLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurface },
  stateBox: { alignItems: 'center', padding: SPACING.xl },
  stateText: { color: COLORS.onSurfaceVariant, textAlign: 'center', fontSize: 14 },
});
