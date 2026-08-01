import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRadioStore } from '../store/radioStore';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const { playbackState, nowPlaying, togglePlayPause, playLive, reconnectFailed } = useRadioStore();
  const insets = useSafeAreaInsets();
  // The mini-player sits below the tab bar, outside the area React Navigation
  // insets for automatically, so on Android it needs its own bottom padding
  // or the gesture/3-button nav bar overlaps and swallows taps on it.
  const navBarPadding = Platform.OS === 'android' ? insets.bottom : 0;

  if (!nowPlaying && playbackState === 'stopped') {
    // Collapsed state: a slim "Listen Live" prompt instead of an empty bar
    return (
      <Pressable style={[styles.collapsedBar, { paddingBottom: 8 + navBarPadding }]} onPress={playLive}>
        <Ionicons name="radio" size={20} color={COLORS.secondary} />
        <Text style={styles.collapsedText}>Tap to listen live</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.bar, { paddingBottom: 10 + navBarPadding }]}
      onPress={() => navigation.navigate('NowPlaying')}
    >
      <View style={styles.liveDot} />
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {nowPlaying?.title ?? 'GhanaTalksRadio'}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {reconnectFailed
            ? 'Connection lost — tap to retry'
            : playbackState === 'error'
            ? "Couldn't play — check your connection"
            : nowPlaying?.subtitle ?? 'Live Broadcast'}
        </Text>
      </View>

      {playbackState === 'loading' ? (
        <ActivityIndicator color={COLORS.onSecondaryContainer} />
      ) : (
        <Pressable
          hitSlop={12}
          onPress={(e) => {
            e.stopPropagation();
            if (reconnectFailed) {
              playLive();
            } else {
              togglePlayPause();
            }
          }}
          style={styles.playButton}
        >
          <Ionicons
            name={reconnectFailed || playbackState === 'error' ? 'refresh' : playbackState === 'playing' ? 'pause' : 'play'}
            size={20}
            color={COLORS.onSecondaryContainer}
          />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  collapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: 8,
  },
  collapsedText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.secondaryContainer,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.onTertiaryContainer,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.onSecondaryContainer,
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: COLORS.onSecondaryContainer,
    fontSize: 12,
    opacity: 0.85,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
