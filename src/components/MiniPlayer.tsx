import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRadioStore } from '../store/radioStore';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const { playbackState, nowPlaying, togglePlayPause, playLive, reconnectFailed } = useRadioStore();
  // MiniPlayer renders below the tab bar (see RootNavigator's MainTabs),
  // so it - not the tab bar - is the screen's true bottom edge, and needs
  // its own safe-area clearance for the home indicator / gesture nav bar.
  const insets = useSafeAreaInsets();

  if (!nowPlaying && playbackState === 'stopped') {
    // Collapsed state: a slim "Listen Live" prompt instead of an empty bar
    return (
      <Pressable style={[styles.collapsedBar, { paddingBottom: 10 + insets.bottom }]} onPress={playLive}>
        <Ionicons name="radio" size={20} color={COLORS.secondary} />
        <Text style={styles.collapsedText}>Tap to listen live</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.bar, { paddingBottom: 10 + insets.bottom }]}
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
    paddingTop: 10,
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
    paddingTop: 10,
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
