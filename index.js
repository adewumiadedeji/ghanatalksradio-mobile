/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Required registration point for @react-native-firebase/messaging - must
// be called here, outside the React tree (same requirement as
// TrackPlayer's playback service below). Placed AFTER registerComponent
// and wrapped in try/catch deliberately: messaging() throws synchronously
// if the native default Firebase app isn't configured yet, and since this
// runs at module-load time, an uncaught throw here stops the rest of this
// file from executing - which meant registerComponent above never ran,
// surfacing as an unrelated-looking "AppRegistry has not been registered"
// crash. The OS already displays "studio-live" topic messages on its own
// while the app is backgrounded/killed (they're sent with a notification
// block, not data-only - see the backend's PushNotificationService), so
// this handler has nothing to do - it only exists because RNFB logs a
// warning if none is registered at all.
try {
  messaging().setBackgroundMessageHandler(async () => {});
} catch {
  // Best-effort, see above - never let this block app startup.
}

// react-native-track-player requires the playback service to be registered
// here, separately from the React tree, so it can run as a headless task
// when the app is backgrounded.
TrackPlayer.registerPlaybackService(() => require('./src/services/playbackService'));
