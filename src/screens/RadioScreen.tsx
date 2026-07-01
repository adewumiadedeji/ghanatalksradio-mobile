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
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useRadioStore } from '../store/radioStore';
import { getYouTubeWatchUrl } from '../services/api';
import { useVideoPosts } from '../services/queries';
import { VideoPost } from '../types';
import { PodcastEpisode } from '../types/podcast';
import { usePodcastEpisodesPage } from '../services/podcastQueries';

export default function RadioScreen({ navigation }: any) {
  const { playbackState, nowPlaying, playLive, playPodcastEpisode } = useRadioStore();

  
  
  const {
    data: episodes = [],
    isLoading: episodesLoading,
    isError: episodesError,
    error: episodesErrorObj,
    refetch: refetchEpisodes,
  } = usePodcastEpisodesPage(1);
  const { data: videos = [], isLoading: videosLoading } = useVideoPosts();

  const isLiveActive = nowPlaying?.isLive && playbackState !== 'stopped';

  const openVideo = (video: VideoPost) => {
    Linking.openURL(getYouTubeWatchUrl(video.videoId)).catch(() => {});
  };

  function isPlayableAudioUrl(url: any) {
    throw new Error('Function not implemented.');
  }

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={episodes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.screenTitle}>Podcast</Text>
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

            <Text style={styles.sectionTitle}>Recent Podcast Episodes</Text>
            {episodesLoading && (
              <ActivityIndicator style={{ marginTop: SPACING.sm }} color={COLORS.secondary} />
            )}
          </View>
        }
        ListEmptyComponent={
          episodesError ? (
            <View style={styles.errorBox}>
              <Ionicons name="cloud-offline-outline" size={28} color={COLORS.outline} />
              <Text style={styles.emptyText}>Couldn't load podcast episodes.</Text>
              <Text style={styles.errorDetail} numberOfLines={2}>
                {episodesErrorObj instanceof Error ? episodesErrorObj.message : 'Unknown error'}
              </Text>
              <Pressable style={styles.retryButton} onPress={() => refetchEpisodes()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : !episodesLoading ? (
            <Text style={styles.emptyText}>No episodes available right now.</Text>
          ) : null
        }
        renderItem={({ item }: { item: PodcastEpisode }) => {
          const playable: any = isPlayableAudioUrl(item.audioUrl);
          return (
            <Pressable
              style={[styles.episodeRow, !playable && styles.episodeRowDisabled]}
              disabled={!playable}
              onPress={() => {
                playPodcastEpisode({ id: item.id, title: item.title, url: item.audioUrl! });
                navigation.navigate('NowPlaying');
              }}
            >
              <Ionicons
                name={playable ? 'play-circle-outline' : 'document-text-outline'}
                size={28}
                color={playable ? COLORS.secondary : COLORS.outline}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.episodeTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {!playable && <Text style={styles.episodeNote}>Transcript only — no audio</Text>}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  header: { padding: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
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
  listContent: { paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.lg },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  episodeRowDisabled: { opacity: 0.5 },
  episodeTitle: { fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  episodeNote: { fontSize: 11, color: COLORS.outline, marginTop: 2 },
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
