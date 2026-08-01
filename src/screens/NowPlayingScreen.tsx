import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useProgress } from 'react-native-track-player';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useRadioStore } from '../store/radioStore';
import { formatEpisodeDate, formatEpisodeTimeRange } from '../utils/podcastContent';
import { getAvailablePlatformLinks } from '../utils/podcastPlatforms';

function formatSeconds(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NowPlayingScreen({ navigation }: any) {
  const { playbackState, nowPlaying, togglePlayPause, playLive, reconnectFailed, stop, seekTo, seekBy } =
    useRadioStore();

  const progress = useProgress(500);
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);
  const isPodcastEpisode = !!nowPlaying && !nowPlaying.isLive;
  const isSeekable = isPodcastEpisode && progress.duration > 0;

  const episodeDate = formatEpisodeDate(nowPlaying?.startDate);
  const episodeTimeRange = formatEpisodeTimeRange(nowPlaying?.startDate, nowPlaying?.endDate);
  const platformLinks = getAvailablePlatformLinks(nowPlaying?.externalLinks as any);
  const hasDetails = isPodcastEpisode && (!!nowPlaying?.description || platformLinks.length > 0);

  const openShow = () => {
    if (!nowPlaying?.showSlug) return;
    navigation.navigate('Main', {
      screen: 'Podcast',
      params: { screen: 'PodcastShow', params: { showSlug: nowPlaying.showSlug } },
    });
  };

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-down" size={28} color={COLORS.onPrimary} />
        </Pressable>
        <Text style={styles.headerLabel}>{isPodcastEpisode ? 'NOW PLAYING · PODCAST' : 'NOW PLAYING'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.artworkWrap}>
        {isPodcastEpisode && nowPlaying?.artworkUrl ? (
          <Image source={{ uri: nowPlaying.artworkUrl }} style={styles.artworkImage} />
        ) : (
          <View style={styles.artwork}>
            <Ionicons name="radio" size={72} color={COLORS.onPrimary} />
          </View>
        )}
      </View>

      <View style={styles.infoBlock}>
        {nowPlaying?.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
        {isPodcastEpisode && !!nowPlaying?.showName && (
          <Pressable onPress={openShow} disabled={!nowPlaying?.showSlug}>
            <Text style={styles.showEyebrow}>{nowPlaying.showName.toUpperCase()}</Text>
          </Pressable>
        )}
        <Text style={styles.title} numberOfLines={3}>
          {nowPlaying?.title ?? 'GhanaTalksRadio'}
        </Text>
        {isPodcastEpisode && (episodeDate || episodeTimeRange) ? (
          <View style={styles.metaRow}>
            {!!episodeDate && <Text style={styles.subtitle}>{episodeDate}</Text>}
            {!!episodeDate && !!episodeTimeRange && <Text style={styles.subtitle}>·</Text>}
            {!!episodeTimeRange && <Text style={styles.subtitle}>{episodeTimeRange}</Text>}
          </View>
        ) : (
          <Text style={styles.subtitle}>
            {reconnectFailed ? 'Connection lost' : nowPlaying?.subtitle ?? 'Tap play to start'}
          </Text>
        )}
      </View>

      {isSeekable && (
        <View style={styles.seekBlock}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={progress.duration}
            value={scrubPosition ?? progress.position}
            minimumTrackTintColor={COLORS.onPrimary}
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor={COLORS.onPrimary}
            onValueChange={setScrubPosition}
            onSlidingComplete={(value) => {
              seekTo(value);
              setScrubPosition(null);
            }}
          />
          <View style={styles.seekTimeRow}>
            <Text style={styles.seekTimeText}>{formatSeconds(scrubPosition ?? progress.position)}</Text>
            <Text style={styles.seekTimeText}>{formatSeconds(progress.duration)}</Text>
          </View>
        </View>
      )}

      <View style={styles.controls}>
        <View style={styles.playbackRow}>
          {isSeekable && (
            <Pressable onPress={() => seekBy(-15)} hitSlop={10} style={styles.skipButton}>
              <Ionicons name="play-back" size={26} color={COLORS.onPrimary} />
              <Text style={styles.skipLabel}>15</Text>
            </Pressable>
          )}

          {playbackState === 'loading' ? (
            <ActivityIndicator size="large" color={COLORS.onPrimary} />
          ) : (
            <Pressable
              style={styles.playButton}
              onPress={() => {
                if (reconnectFailed || playbackState === 'stopped' || playbackState === 'error') {
                  playLive();
                } else {
                  togglePlayPause();
                }
              }}
            >
              <Ionicons
                name={
                  reconnectFailed || playbackState === 'stopped' || playbackState === 'error'
                    ? 'refresh'
                    : playbackState === 'playing'
                    ? 'pause'
                    : 'play'
                }
                size={40}
                color={COLORS.primary}
              />
            </Pressable>
          )}

          {isSeekable && (
            <Pressable onPress={() => seekBy(15)} hitSlop={10} style={styles.skipButton}>
              <Ionicons name="play-forward" size={26} color={COLORS.onPrimary} />
              <Text style={styles.skipLabel}>15</Text>
            </Pressable>
          )}
        </View>

        {playbackState !== 'stopped' && (
          <Pressable onPress={stop} style={styles.stopButton}>
            <Text style={styles.stopText}>Stop</Text>
          </Pressable>
        )}
      </View>

      {hasDetails && (
        <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent}>
          {!!nowPlaying?.description && (
            <View style={styles.detailSection}>
              <Text style={styles.detailHeading}>ABOUT THIS EPISODE</Text>
              <Text style={styles.detailDescription}>{nowPlaying.description}</Text>
            </View>
          )}

          {platformLinks.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailHeading}>LISTEN ON</Text>
              <View style={styles.platformGrid}>
                {platformLinks.map((link) => (
                  <Pressable
                    key={link.key}
                    style={styles.platformLink}
                    onPress={() => Linking.openURL(link.url).catch(() => {})}
                  >
                    <Ionicons name={link.icon} size={18} color={link.accent} />
                    <Text style={styles.platformLinkText}>{link.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {!!nowPlaying?.showSlug && (
            <Pressable style={styles.viewShowButton} onPress={openShow}>
              <Text style={styles.viewShowText}>More from {nowPlaying.showName}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.onPrimary} />
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.primaryContainer },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  headerLabel: { color: COLORS.onPrimaryContainer, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  artworkWrap: { alignItems: 'center', marginTop: SPACING.lg },
  artwork: {
    width: 180,
    height: 180,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: 180,
    height: 180,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  infoBlock: { alignItems: 'center', marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, gap: 6 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.onTertiaryContainer,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  showEyebrow: { color: COLORS.secondaryContainer, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  title: { color: COLORS.onPrimary, fontSize: 21, fontWeight: '700', textAlign: 'center' },
  metaRow: { flexDirection: 'row', gap: 6 },
  subtitle: { color: COLORS.onPrimaryContainer, fontSize: 13, textAlign: 'center' },
  seekBlock: { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  slider: { width: '100%', height: 32 },
  seekTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  seekTimeText: { color: COLORS.onPrimaryContainer, fontSize: 12 },
  controls: { alignItems: 'center', marginTop: SPACING.lg, gap: SPACING.sm },
  playbackRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: { alignItems: 'center', gap: 2, width: 48 },
  skipLabel: { color: COLORS.onPrimary, fontSize: 10, fontWeight: '700' },
  stopButton: { paddingVertical: 6, paddingHorizontal: 16 },
  stopText: { color: COLORS.onPrimaryContainer, fontSize: 14, fontWeight: '600' },
  detailsScroll: { flex: 1, marginTop: SPACING.md },
  detailsContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.md },
  detailSection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  detailHeading: { color: COLORS.onPrimaryContainer, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  detailDescription: { color: COLORS.onPrimary, fontSize: 14, lineHeight: 21 },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  platformLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  platformLinkText: { color: COLORS.onPrimary, fontSize: 12, fontWeight: '600' },
  viewShowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  viewShowText: { color: COLORS.onPrimary, fontSize: 13, fontWeight: '700' },
});
