import { Platform } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import { requestTrackingPermission } from 'react-native-tracking-transparency';
import { appOpenAdManager } from './appOpenAdManager';

// iOS 14+ requires the App Tracking Transparency prompt before any IDFA-based
// (personalized) ad request - AdMob will still serve non-personalized ads if
// this is skipped or denied, so it's not a hard blocker either way.
export async function initAds() {
  if (Platform.OS === 'ios') {
    await requestTrackingPermission();
  }
  await mobileAds().initialize();
  appOpenAdManager.start();
}
