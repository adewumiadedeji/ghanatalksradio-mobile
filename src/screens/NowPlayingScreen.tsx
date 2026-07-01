import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useRadioStore } from '../store/radioStore';

export default function NowPlayingScreen({ navigation }: any) {
  const { playbackState, nowPlaying, togglePlayPause, playLive, reconnectFailed, stop } =
    useRadioStore();

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-down" size={28} color={COLORS.onPrimary} />
        </Pressable>
        <Text style={styles.headerLabel}>NOW PLAYING</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.artworkWrap}>
        <View style={styles.artwork}>
          <Ionicons name="radio" size={72} color={COLORS.onPrimary} />
        </View>
      </View>

      <View style={styles.infoBlock}>
        {nowPlaying?.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
        <Text style={styles.title}>{nowPlaying?.title ?? 'GhanaTalksRadio'}</Text>
        <Text style={styles.subtitle}>
          {reconnectFailed ? 'Connection lost' : nowPlaying?.subtitle ?? 'Tap play to start'}
        </Text>
      </View>

      <View style={styles.controls}>
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

        {playbackState !== 'stopped' && (
          <Pressable onPress={stop} style={styles.stopButton}>
            <Text style={styles.stopText}>Stop</Text>
          </Pressable>
        )}
      </View>
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
  artworkWrap: { alignItems: 'center', marginTop: SPACING.xl },
  artwork: {
    width: 220,
    height: 220,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBlock: { alignItems: 'center', marginTop: SPACING.xl, paddingHorizontal: SPACING.lg, gap: 8 },
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
  title: { color: COLORS.onPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: COLORS.onPrimaryContainer, fontSize: 14, textAlign: 'center' },
  controls: { alignItems: 'center', marginTop: SPACING.xxl, gap: SPACING.md },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: { paddingVertical: 8, paddingHorizontal: 16 },
  stopText: { color: COLORS.onPrimaryContainer, fontSize: 14, fontWeight: '600' },
});
