import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// The AdMob App IDs themselves live in app.json (react-native-google-mobile-ads
// reads them from there to configure both native projects at build time).
const PROD_AD_UNIT_IDS = {
  appOpen: Platform.select({
    ios: 'ca-app-pub-2687023193888645/9962210959',
    android: 'ca-app-pub-2687023193888645/3881008016',
    default: '',
  }),
  banner: Platform.select({
    ios: 'ca-app-pub-2687023193888645/3912797604',
    android: 'ca-app-pub-2687023193888645/7548790286',
    default: '',
  }),
};

// Google's own test units - AdMob rejects real ad unit IDs from unregistered
// test devices, so debug builds always use these instead to avoid invalid
// traffic warnings/account flags during development.
const TEST_AD_UNIT_IDS = {
  appOpen: TestIds.APP_OPEN,
  banner: TestIds.ADAPTIVE_BANNER,
};

export const AD_UNIT_IDS = __DEV__ ? TEST_AD_UNIT_IDS : PROD_AD_UNIT_IDS;
