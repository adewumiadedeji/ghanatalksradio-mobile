import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
} from 'react-native-track-player';
import { LIVE_STREAM_URL } from './api';
import { getSessionStatus, resolveStreamMount, startListeningSession, stopListeningSession } from './streamingApi';

let isSetup = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;
const SEEK_INTERVAL_SECONDS = 15;

// Set once startListeningSession() resolves (best-effort, never blocks
// playback - see playLiveStream()). Passed to stopListeningSession() when
// playback actually stops, so the backend's Live Listeners screen reflects
// real session durations instead of sessions that never end.
let currentSessionToken: string | null = null;

async function endCurrentListeningSession() {
  stopKickPoll();
  if (!currentSessionToken) return;
  const token = currentSessionToken;
  currentSessionToken = null;
  try {
    await stopListeningSession(token);
  } catch {
    // Best-effort - the backend's own stale-session cleanup closes this
    // out eventually regardless (CloseStaleListenerSessions).
  }
}

// How this app finds out a staff member kicked it off, since there's no
// real-time push from this backend (see PublicListenController's docblock
// on the Laravel side) - polling is the honest ceiling here, not a
// placeholder for something better. Same interval as the admin panel's own
// live-listeners auto-refresh.
const KICK_POLL_MS = 15000;
let kickPollHandle: ReturnType<typeof setInterval> | null = null;
let onKickedCallback: (() => void) | null = null;

/** Call once at app startup (mirrors registerReconnectHandler's shape) to
 * learn when a staff member has kicked this listener off. */
export function registerKickWatcher(onKicked: () => void) {
  onKickedCallback = onKicked;
}

function startKickPoll() {
  stopKickPoll();
  kickPollHandle = setInterval(async () => {
    if (!currentSessionToken) return;
    const token = currentSessionToken;
    try {
      const status = await getSessionStatus(token);
      if (status.active) return;
      // The token may have already been cleared/replaced by a normal
      // stop()/reconnect while this request was in flight - only act if
      // it's still the session we were checking.
      if (currentSessionToken !== token) return;
      stopKickPoll();
      currentSessionToken = null;
      await TrackPlayer.stop();
      onKickedCallback?.();
    } catch {
      // Network hiccup - try again next tick. Never treat a failed check
      // as "kicked": that would stop playback on nothing more than a
      // dropped request.
    }
  }, KICK_POLL_MS);
}

function stopKickPoll() {
  if (kickPollHandle) {
    clearInterval(kickPollHandle);
    kickPollHandle = null;
  }
}

export async function setupPlayer() {
  if (isSetup) return;
  // autoHandleInterruptions defaults to false, meaning the player never
  // requests Android audio focus at all - without it, another app starting
  // playback has no reason to notify this one, so both streams play at once.
  await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  await TrackPlayer.updateOptions({
    // android: {
    //   appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    // },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SeekTo,
      Capability.JumpForward,
      Capability.JumpBackward,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
    forwardJumpInterval: SEEK_INTERVAL_SECONDS,
    backwardJumpInterval: SEEK_INTERVAL_SECONDS,
    android: {
      // Pause outright (rather than just ducking the volume) on any focus
      // interruption, matching what a live radio listener expects when
      // another app starts playing audio.
      alwaysPauseOnInterruption: true,
    },
  });
  await TrackPlayer.setRepeatMode(RepeatMode.Off);
  isSetup = true;
}

export async function playLiveStream() {
  // Safe to call again mid-session (e.g. the reconnect handler below calls
  // this directly) - closes out whatever session is still open first so a
  // reconnect doesn't orphan it.
  await endCurrentListeningSession();

  // Best-effort, time-boxed (see streamingApi's REQUEST_TIMEOUT_MS) - a slow
  // or unreachable backend must never delay the listener pressing play, so
  // this falls back to the hardcoded default mount rather than waiting.
  let streamUrl = LIVE_STREAM_URL;
  try {
    const mount = await resolveStreamMount();
    streamUrl = mount.stream_url;
  } catch {
    // keep the fallback
  }

  await setupPlayer();
  reconnectAttempts = 0;
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: 'live-stream',
    url: streamUrl,
    title: 'GhanaTalksRadio — Live',
    artist: 'Live Broadcast',
    isLiveStream: true,
  });
  await TrackPlayer.play();

  // Fire-and-forget, after playback has already started - registering the
  // session is bookkeeping for the admin panel's Live Listeners screen, not
  // something a listener should ever wait on.
  startListeningSession()
    .then((token) => {
      currentSessionToken = token;
      startKickPoll();
    })
    .catch(() => {
      // No session recorded server-side; playback itself is unaffected.
    });
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
  // Fire-and-forget - matches playLiveStream()'s posture that session
  // bookkeeping should never be on the critical path for playback controls.
  void endCurrentListeningSession();
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

// Source of truth for the app's playbackState - reflects what the native
// player is actually doing (buffering, erroring, playing) rather than
// assuming play() succeeded the instant it resolves. play()/add() resolving
// only means the command was issued, not that audio is actually flowing -
// on a dead network the player sits in Buffering/Error while the old code
// had already optimistically marked the UI "playing", so the mini-player
// showed a playing icon with no sound at all.
export function registerPlaybackStateHandler(onStateChange: (state: State) => void) {
  return TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    onStateChange(state);
  });
}

// With autoHandleInterruptions/alwaysPauseOnInterruption on, the native
// layer already pauses (or stops, if permanent) playback on its own - this
// just keeps the mini-player's play/pause UI in sync with that.
export function registerAudioInterruptionHandler(onDuck: (permanent: boolean) => void) {
  return TrackPlayer.addEventListener(Event.RemoteDuck, ({ paused, permanent }) => {
    if (!paused) return;
    onDuck(permanent);
  });
}

export async function seekTo(positionSeconds: number) {
  await TrackPlayer.seekTo(Math.max(0, positionSeconds));
}

export async function seekBy(offsetSeconds: number) {
  await TrackPlayer.seekBy(offsetSeconds);
}

export async function getPlaybackState(): Promise<State> {
  const { state } = await TrackPlayer.getPlaybackState();
  return state;
}
