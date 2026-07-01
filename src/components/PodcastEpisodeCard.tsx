import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useRadioStore } from '../store/radioStore';
import { PodcastEpisode } from '../types/podcast';
import { formatEpisodeDate, formatEpisodeTimeRange } from '../utils/podcastContent';
import { getAvailablePlatformLinks } from '../utils/podcastPlatforms';

interface PodcastEpisodeCardProps {
  episode: PodcastEpisode;
}

/**
 * One podcast/catchup episode card. Ported from the web version's
 * PodcastEpisodeCard.tsx, adapted to this app's existing audio architecture:
 * the web version plays inline via a local <audio> element per card; this
 * app already has a single shared TrackPlayer-based player (the live stream
 * uses the same engine), so tapping Play here routes through that same
 * radioStore instead of creating a second, parallel audio system. Tapping
 * Play also opens the Now Playing screen, same as the rest of the app.
 */
export function PodcastEpisodeCard({ episode }: PodcastEpisodeCardProps) {
  const navigation = useNavigation<any>();
  const { playPodcastEpisode, playbackState, nowPlaying } = useRadioStore();

  const timeRange = formatEpisodeTimeRange(episode.startDate, episode.endDate);
  const platformLinks = getAvailablePlatformLinks(episode.show.external as any);
  const isThisPlaying = nowPlaying?.id === `episode-${episode.id}` && playbackState === 'playing';

  const handlePlay = () => {
    if (!episode.audioUrl) return;
    playPodcastEpisode({ id: episode.id, title: episode.title, url: episode.audioUrl });
    navigation.navigate('NowPlaying');
  };

  return (
    <View style={styles.card}>
      {episode.show.imageUrl && (
        <Image source={{ uri: episode.show.imageUrl }} style={styles.artwork} />
      )}
      <View style={styles.body}>
        <Pressable onPress={() => navigation.navigate('PodcastShow', { showSlug: episode.show.slug })}>
          <Text style={styles.showName}>{episode.show.name.toUpperCase()}</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            navigation.navigate('PodcastEpisodeDetail', {
              showSlug: episode.show.slug,
              episodeSlug: episode.slug,
            })
          }
        >
          <Text style={styles.title} numberOfLines={2}>
            {episode.title}
          </Text>
        </Pressable>

        {!!episode.description && (
          <Text style={styles.description} numberOfLines={2}>
            {episode.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatEpisodeDate(episode.startDate)}</Text>
          {!!timeRange && <Text style={styles.meta}>{timeRange}</Text>}
        </View>
        {!episode.audioUrl && (
          <Text style={styles.unavailableNote}>Audio unavailable for this episode</Text>
        )}
        <View style={styles.actionsRow}>
          {episode.audioUrl && (
            <Pressable style={styles.playButton} onPress={handlePlay}>
              <Ionicons name={isThisPlaying ? 'pause' : 'play'} size={12} color={COLORS.onPrimary} />
              <Text style={styles.playButtonText}>{isThisPlaying ? 'Pause' : 'Play'}</Text>
            </Pressable>
          )}

          {platformLinks.length > 0 && (
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>LISTEN ON</Text>
              {platformLinks.map((link) => (
                <Pressable
                  key={link.key}
                  style={styles.serviceLink}
                  onPress={() => Linking.openURL(link.url).catch(() => {})}
                >
                  <Ionicons name={link.icon} size={14} color={link.accent} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.sm,
  },
  artwork: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainer,
  },
  body: { flex: 1, gap: 3 },
  showName: { fontSize: 10, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.5 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface, lineHeight: 18 },
  description: { fontSize: 12, color: COLORS.onSurfaceVariant, lineHeight: 16 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  meta: { fontSize: 11, color: COLORS.outline },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // flexWrap: 'wrap',
    gap: 2,
    marginTop: 4,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  playButtonText: { fontSize: 11, fontWeight: '700', color: COLORS.onPrimary },
  unavailableNote: { fontSize: 10, fontStyle: 'italic', color: COLORS.outline },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  serviceLabel: { fontSize: 9, fontWeight: '700', color: COLORS.outline, letterSpacing: 0.4 },
  serviceLink: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
