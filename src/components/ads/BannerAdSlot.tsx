import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../../config/ads';
import { SPACING } from '../../theme/colors';

interface BannerAdSlotProps {
  size?: BannerAdSize;
  style?: ViewStyle;
}

// No placeholder box when the ad fails - an empty reserved slot reads as a
// broken layout, so the whole component collapses to nothing instead.
export function BannerAdSlot({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER, style }: BannerAdSlotProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <View style={[styles.wrap, style]}>
      <BannerAd unitId={AD_UNIT_IDS.banner} size={size} onAdFailedToLoad={() => setFailed(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', marginVertical: SPACING.md },
});
