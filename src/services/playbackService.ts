import TrackPlayer, { Event } from 'react-native-track-player';

// Required by react-native-track-player: handles remote events (lock screen,
// headset buttons, Android notification controls) even when the app is backgrounded.
module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
};
