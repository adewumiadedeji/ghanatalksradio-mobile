import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
  State,
} from 'react-native-track-player';
import { LIVE_STREAM_URL } from './api';

let isSetup = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

export async function setupPlayer() {
  if (isSetup) return;
  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SeekTo,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
  });
  await TrackPlayer.setRepeatMode(RepeatMode.Off);
  isSetup = true;
}

export async function playLiveStream() {
  await setupPlayer();
  reconnectAttempts = 0;
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: 'live-stream',
    url: LIVE_STREAM_URL,
    title: 'GhanaTalksRadio — Live',
    artist: 'Live Broadcast',
    isLiveStream: true,
  });
  await TrackPlayer.play();
}

export async function playEpisode(episode: { id: string | number; title: string; url: string }) {
  await setupPlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: `episode-${episode.id}`,
    url: episode.url,
    title: episode.title,
    artist: 'GhanaTalksRadio Podcast',
  });
  await TrackPlayer.play();
}

export async function pausePlayback() {
  await TrackPlayer.pause();
}

export async function resumePlayback() {
  await TrackPlayer.play();
}

export async function stopPlayback() {
  reconnectAttempts = 0;
  await TrackPlayer.stop();
}

// Auto-reconnect logic ported from the Firestick app's RadioPlaybackService:
// 5 attempts at 3-second intervals when the live stream drops.
export function registerReconnectHandler(onGiveUp: () => void) {
  return TrackPlayer.addEventListener(Event.PlaybackError, async () => {
    const currentTrack = await TrackPlayer.getActiveTrack();
    if (currentTrack?.id !== 'live-stream') return; // only auto-reconnect the live stream

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      onGiveUp();
      return;
    }
    reconnectAttempts += 1;
    setTimeout(async () => {
      try {
        await playLiveStream();
      } catch {
        // will retry again on the next PlaybackError event, up to the max
      }
    }, RECONNECT_DELAY_MS);
  });
}

export async function getPlaybackState(): Promise<State> {
  const { state } = await TrackPlayer.getPlaybackState();
  return state;
}
