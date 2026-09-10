import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateWhenReady } from '../navigation/navigationRef';

/**
 * Push notifications for "studio goes live" AND advertiser promotions -
 * see the backend's
 * Modules/Notification/app/Application/PushNotificationService.php
 * docblock for the full picture. Uses FCM topic messaging: every device
 * subscribes itself to these topics locally (no backend registration/
 * device-token database involved at all), so sending on the admin side
 * is just one send to the relevant topic.
 *
 * Three topics: "studio-live" and "engagement" are both always on (no
 * UI to turn either off - engagement pushes are the station's own
 * raffle/poll/quiz/prediction launches, not advertiser content, so they
 * stay separate from the promotions opt-out below on purpose), and
 * "promotions" is a distinct opt-out toggle (see isPromotionsEnabled/
 * setPromotionsEnabled, surfaced in ProfileScreen) - a listener who mutes
 * advertiser pushes should never lose live-show or engagement alerts in
 * the process.
 */
const STUDIO_LIVE_TOPIC = 'studio-live';
const PROMOTIONS_TOPIC = 'promotions';
const ENGAGEMENT_TOPIC = 'engagement';

// Absent key = never toggled = subscribed by default, matching
// studio-live's existing always-on behavior until the user actively
// opts out.
const PROMOTIONS_PREFERENCE_KEY = 'gtr_promotions_notifications_enabled_v1';

export async function isPromotionsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(PROMOTIONS_PREFERENCE_KEY);
  return raw === null ? true : raw === '1';
}

/**
 * Called from ProfileScreen's toggle. Persists the choice first (so the
 * preference survives even if the topic call itself fails) then updates
 * the live FCM subscription to match - fails soft, same posture as
 * initPushNotifications below, since a failed unsubscribe shouldn't
 * block the rest of the settings screen.
 */
export async function setPromotionsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PROMOTIONS_PREFERENCE_KEY, enabled ? '1' : '0');

  try {
    if (enabled) {
      await messaging().subscribeToTopic(PROMOTIONS_TOPIC);
    } else {
      await messaging().unsubscribeFromTopic(PROMOTIONS_TOPIC);
    }
  } catch (err) {
    console.warn('setPromotionsEnabled: topic (un)subscribe failed', err);
  }
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Only required on API 33+ (Android 13) - PermissionsAndroid.request
    // resolves 'granted' immediately on older versions where this
    // permission doesn't exist, so no version check needed here.
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

function goToNowPlaying() {
  navigateWhenReady('NowPlaying');
}

/** Polls have no dedicated screen yet (they're embedded elsewhere, not their own stack route) - falls back to NowPlaying rather than a broken navigate() call. */
function goToEngagementScreen(engagementType: string | undefined) {
  switch (engagementType) {
    case 'raffle':
      navigateWhenReady('Raffle');
      return;
    case 'quiz':
      navigateWhenReady('Quizzes');
      return;
    case 'prediction':
      navigateWhenReady('Predictions');
      return;
    default:
      goToNowPlaying();
  }
}

/**
 * Routes a tapped/opened notification based on `data.type`, which both
 * PushNotificationService methods set (`studio_live` / `promotion` - see
 * that class's docblock). A promotion opens its deep_link_url (the ad
 * creative's cta_url) via the OS, not in-app navigation - the target is
 * advertiser-controlled and not necessarily a screen this app knows
 * about (could be an external site). Falls back to NowPlaying for any
 * unrecognized/missing type, matching this function's pre-promotions
 * behavior exactly.
 */
function handleNotificationTap(data: Record<string, string> | undefined) {
  if (data?.type === 'promotion') {
    const url = data.deep_link_url;
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
    return;
  }

  if (data?.type === 'engagement') {
    goToEngagementScreen(data.engagement_type);
    return;
  }

  goToNowPlaying();
}

/**
 * Call once on app start (see App.tsx). Fails soft - a denied permission
 * or subscribe failure just means this device won't get notified, never
 * something that should block the rest of the app - but every failure is
 * logged via console.warn first. An earlier version of this swallowed
 * errors with a bare `catch {}` and no logging at all, which is exactly
 * what "notification doesn't arrive and there's no error to go on" looks
 * like from the outside - there was no missing crash to find, just no
 * visibility into whichever step (permission, subscribe, or the native
 * Firebase app not being ready yet) actually failed.
 */
export async function initPushNotifications() {
  try {
    const permitted = await ensurePermission();
    if (!permitted) {
      console.warn('initPushNotifications: notification permission not granted, skipping.');
      return;
    }

    try {
      await messaging().subscribeToTopic(STUDIO_LIVE_TOPIC);
    } catch (err) {
      console.warn('initPushNotifications: subscribeToTopic failed', err);
      // Don't return - the message handlers below are still worth
      // registering in case a later retry (or a future app version)
      // subscribes successfully without a full app restart.
    }

    try {
      await messaging().subscribeToTopic(ENGAGEMENT_TOPIC);
    } catch (err) {
      console.warn('initPushNotifications: engagement subscribeToTopic failed', err);
    }

    try {
      if (await isPromotionsEnabled()) {
        await messaging().subscribeToTopic(PROMOTIONS_TOPIC);
      }
    } catch (err) {
      console.warn('initPushNotifications: promotions subscribeToTopic failed', err);
    }

    // Foreground: FCM doesn't show a system notification while the app is
    // open (that's standard OS behavior, not a bug) - this is the one
    // place we're responsible for surfacing it ourselves. A plain Alert
    // keeps this dependency-free; swap for a nicer in-app banner later if
    // wanted.
    messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title ?? 'GhanaTalksRadio';
      const body = remoteMessage.notification?.body ?? '';
      const data = remoteMessage.data as Record<string, string> | undefined;

      if (data?.type === 'promotion') {
        const url = data.deep_link_url;
        Alert.alert(
          title,
          body,
          url ? [{ text: 'Not now', style: 'cancel' }, { text: 'View', onPress: () => Linking.openURL(url).catch(() => {}) }] : [{ text: 'OK' }]
        );
        return;
      }

      if (data?.type === 'engagement') {
        Alert.alert(title, body, [
          { text: 'Not now', style: 'cancel' },
          { text: 'View', onPress: () => goToEngagementScreen(data.engagement_type) },
        ]);
        return;
      }

      Alert.alert(title, body, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Listen', onPress: goToNowPlaying },
      ]);
    });

    // Background -> foreground: user tapped the OS notification while the
    // app was already running in the background.
    messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNotificationTap(remoteMessage.data as Record<string, string> | undefined);
    });

    // Killed -> foreground: app was launched by tapping the notification.
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      handleNotificationTap(initialNotification.data as Record<string, string> | undefined);
    }
  } catch (err) {
    console.warn('initPushNotifications: setup failed', err);
  }
}
