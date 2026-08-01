import { AppState, AppStateStatus } from 'react-native';
import { AppOpenAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../../config/ads';

// Google's own guidance is to avoid showing an App Open ad on every single
// foreground - this cooldown keeps it from appearing more than once per
// window, so returning to the app seconds after backgrounding it doesn't
// interrupt the user again.
const COOLDOWN_MS = 4 * 60 * 60 * 1000;

class AppOpenAdManager {
  private ad: AppOpenAd | null = null;
  private isLoaded = false;
  private isShowing = false;
  private lastShownAt = 0;
  private hasSeenFirstActiveState = false;
  private appState: AppStateStatus = AppState.currentState;

  start() {
    this.loadAd();
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private loadAd() {
    this.isLoaded = false;
    this.ad = AppOpenAd.createForAdRequest(AD_UNIT_IDS.appOpen);

    this.ad.addAdEventListener(AdEventType.LOADED, () => {
      this.isLoaded = true;
    });
    this.ad.addAdEventListener(AdEventType.ERROR, () => {
      this.isLoaded = false;
    });
    this.ad.addAdEventListener(AdEventType.CLOSED, () => {
      this.isShowing = false;
      this.loadAd();
    });

    this.ad.load();
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    const cameToForeground =
      (this.appState === 'background' || this.appState === 'inactive') && nextState === 'active';
    this.appState = nextState;

    if (nextState !== 'active') return;

    // Skip the very first activation (cold start) - the app's own splash /
    // initial screen should be the first thing the user sees, not an ad.
    if (!this.hasSeenFirstActiveState) {
      this.hasSeenFirstActiveState = true;
      return;
    }

    if (!cameToForeground) return;
    this.maybeShow();
  };

  private maybeShow() {
    if (this.isShowing || !this.isLoaded || !this.ad) return;
    if (Date.now() - this.lastShownAt < COOLDOWN_MS) return;

    this.isShowing = true;
    this.lastShownAt = Date.now();
    this.ad.show().catch(() => {
      this.isShowing = false;
    });
  }
}

export const appOpenAdManager = new AppOpenAdManager();
