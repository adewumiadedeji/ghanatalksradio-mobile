import { Platform, PermissionsAndroid, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { navigateWhenReady } from '../navigation/navigationRef';

/**
 * Push notifications for "studio goes live" - see the backend's
 * Modules/Notification/app/Application/PushNotificationService.php
 * docblock for the full picture. Uses FCM topic messaging: every device
 * subscribes itself to the "studio-live" topic locally (no backend
 * registration/device-token database involved at all), so Go Live on
 * the admin side is just one send to that topic.
 */
const STUDIO_LIVE_TOPIC = 'studio-live';

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

    // Foreground: FCM doesn't show a system notification while the app is
    // open (that's standard OS behavior, not a bug) - this is the one
    // place we're responsible for surfacing it ourselves. A plain Alert
    // keeps this dependency-free; swap for a nicer in-app banner later if
    // wanted.
    messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title ?? 'GhanaTalksRadio';
      const body = remoteMessage.notification?.body ?? '';
      Alert.alert(title, body, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Listen', onPress: goToNowPlaying },
      ]);
    });

    // Background -> foreground: user tapped the OS notification while the
    // app was already running in the background.
    messaging().onNotificationOpenedApp(() => {
      goToNowPlaying();
    });

    // Killed -> foreground: app was launched by tapping the notification.
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      goToNowPlaying();
    }
  } catch (err) {
    console.warn('initPushNotifications: setup failed', err);
  }
}
