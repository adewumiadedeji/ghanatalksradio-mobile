/**
 * @format
 */

import {AppRegistry} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

// react-native-track-player requires the playback service to be registered
// here, separately from the React tree, so it can run as a headless task
// when the app is backgrounded.
TrackPlayer.registerPlaybackService(() => require('./src/services/playbackService'));
