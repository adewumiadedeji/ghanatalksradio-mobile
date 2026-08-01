import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { COLORS, SPACING } from '../theme/colors';

const HIDE_DELAY_MS = 3000;
const ANIMATION_DURATION_MS = 250;
const HIDDEN_OFFSET = -80;

type BannerState = 'offline' | 'online' | null;

/**
 * Global connectivity banner: turns red and stays up for as long as the app
 * is offline, then turns green ("Back online") and auto-dismisses a few
 * seconds after connectivity returns. Doesn't show anything on first mount
 * if the app is already online - only reacts to actual transitions, so it
 * doesn't flash a "back online" message the user never asked about.
 */
export function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  const [bannerState, setBannerState] = useState<BannerState>(null);
  const [displayState, setDisplayState] = useState<'offline' | 'online'>('offline');
  const hasCheckedInitial = useRef(false);
  const wasConnected = useRef<boolean | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can briefly be null while NetInfo is still
      // determining reachability - only isConnected === false is treated as
      // a confirmed "offline", to avoid a false-positive flash on startup.
      const isConnected = state.isConnected === true && state.isInternetReachable !== false;

      if (!hasCheckedInitial.current) {
        hasCheckedInitial.current = true;
        wasConnected.current = isConnected;
        if (!isConnected) {
          setDisplayState('offline');
          setBannerState('offline');
        }
        return;
      }

      if (wasConnected.current && !isConnected) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setDisplayState('offline');
        setBannerState('offline');
      } else if (!wasConnected.current && isConnected) {
        setDisplayState('online');
        setBannerState('online');
        hideTimer.current = setTimeout(() => setBannerState(null), HIDE_DELAY_MS);
      }
      wasConnected.current = isConnected;
    });

    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: bannerState ? 0 : HIDDEN_OFFSET,
      duration: ANIMATION_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [bannerState, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          paddingTop: insets.top + SPACING.sm,
          backgroundColor: displayState === 'offline' ? COLORS.error : COLORS.success,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.text}>
        {displayState === 'offline' ? 'No internet connection' : 'Back online'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
