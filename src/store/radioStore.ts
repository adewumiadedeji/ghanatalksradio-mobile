import { create } from 'zustand';
import { State as NativePlaybackState } from 'react-native-track-player';
import { PlaybackState } from '../types';
import { PodcastEpisode, PodcastExternalLinks } from '../types/podcast';
import {
  playLiveStream,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  playEpisode as playEpisodeService,
  registerReconnectHandler,
  registerAudioInterruptionHandler,
  registerPlaybackStateHandler,
  registerKickWatcher,
  seekTo as seekToService,
  seekBy as seekByService,
} from '../services/radioService';
import { getNowPlaying } from '../services/streamingApi';

// How often to re-check what's on the published schedule while the live
// stream is playing - matches the poll interval LiquidSoap itself uses
// against the same backend (docs/architecture/07-liquidsoap-integration-
// guide.md §2), since a programme can change mid-listen.
const NOW_PLAYING_POLL_MS = 60000;
let nowPlayingPollHandle: ReturnType<typeof setInterval> | null = null;

function stopNowPlayingPoll() {
  if (nowPlayingPollHandle) {
    clearInterval(nowPlayingPollHandle);
    nowPlayingPollHandle = null;
  }
}

// Maps TrackPlayer's real native state onto this app's simpler UI-facing
// enum. Returns undefined for states with no meaningful UI distinction
// (e.g. State.Ready, a brief transitional state between reset() and play())
// so the watcher below leaves playbackState alone rather than flickering.
function mapNativeState(state: NativePlaybackState): PlaybackState | undefined {
  switch (state) {
    case NativePlaybackState.Loading:
    case NativePlaybackState.Buffering:
      return 'loading';
    case NativePlaybackState.Playing:
      return 'playing';
    case NativePlaybackState.Paused:
      return 'paused';
    case NativePlaybackState.Error:
      return 'error';
    case NativePlaybackState.Stopped:
    case NativePlaybackState.None:
    case NativePlaybackState.Ended:
      return 'stopped';
    default:
      return undefined;
  }
}

interface NowPlaying {
  id: string;
  title: string;
  subtitle: string;
  isLive: boolean;
  // Podcast-only metadata, so NowPlayingScreen can show more than just a
  // title - undefined for the live stream, which has none of this.
  showName?: string;
  showSlug?: string;
  artworkUrl?: string | null;
  description?: string;
  startDate?: string;
  endDate?: string;
  externalLinks?: PodcastExternalLinks;
}

interface RadioState {
  playbackState: PlaybackState;
  nowPlaying: NowPlaying | null;
  reconnectFailed: boolean;
  /** True after a station moderator ends this listener's session from the
   * admin panel (see radioService's kick watcher) - distinct from
   * reconnectFailed (a network problem) so the UI can show a different,
   * accurate message for each. Cleared on the next playLive(). */
  kicked: boolean;
  playLive: () => Promise<void>;
  playPodcastEpisode: (episode: PodcastEpisode) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  /** No-op unless currently playing. Used to duck the live stream for
   * something else needing exclusive audio (e.g. a YouTube video screen). */
  pause: () => Promise<void>;
  /** No-op unless currently paused. Pairs with pause() above. */
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  /** Seeking only makes sense for on-demand podcast playback, not the live
   * broadcast - callers should gate these on !nowPlaying?.isLive. */
  seekTo: (positionSeconds: number) => Promise<void>;
  seekBy: (offsetSeconds: number) => Promise<void>;
  initReconnectWatcher: () => void;
  initAudioInterruptionWatcher: () => void;
  initPlaybackStateWatcher: () => void;
  initKickWatcher: () => void;
}

let reconnectWatcherStarted = false;
let audioInterruptionWatcherStarted = false;
let playbackStateWatcherStarted = false;
let kickWatcherStarted = false;

export const useRadioStore = create<RadioState>((set, get) => ({
  playbackState: 'stopped',
  nowPlaying: null,
  reconnectFailed: false,
  kicked: false,

  // playbackState intentionally isn't set to 'playing' here once the calls
  // below resolve - resolving only means the play command was issued, not
  // that audio is actually flowing. The real state (playing/buffering/error)
  // comes from initPlaybackStateWatcher, which reflects what the native
  // player is actually doing - otherwise a dead network leaves the mini-player
  // stuck showing "playing" with no sound at all.
  playLive: async () => {
    set({ playbackState: 'loading', reconnectFailed: false, kicked: false });
    try {
      await playLiveStream();
      set({
        nowPlaying: { id: 'live-stream', title: 'Live Broadcast', subtitle: 'GhanaTalksRadio', isLive: true },
      });

      // Best-effort - a slow/unreachable backend just means the generic
      // "Live Broadcast" title above stays as-is, never blocks playback.
      const refreshNowPlaying = async () => {
        try {
          const programme = await getNowPlaying();
          // Only overwrite if still showing the live stream - a poll firing
          // after the listener switched to a podcast episode shouldn't
          // clobber that episode's metadata.
          if (!get().nowPlaying?.isLive) return;
          set({
            nowPlaying: {
              id: 'live-stream',
              title: programme?.name ?? 'Live Broadcast',
              subtitle: programme?.presenter ?? 'GhanaTalksRadio',
              isLive: true,
            },
          });
        } catch {
          // keep whatever's currently shown
        }
      };

      stopNowPlayingPoll();
      refreshNowPlaying();
      nowPlayingPollHandle = setInterval(refreshNowPlaying, NOW_PLAYING_POLL_MS);
    } catch {
      set({ playbackState: 'error' });
    }
  },

  playPodcastEpisode: async (episode) => {
    if (!episode.audioUrl) return;
    stopNowPlayingPoll();
    set({ playbackState: 'loading', reconnectFailed: false });
    try {
      await playEpisodeService({ id: episode.id, title: episode.title, url: episode.audioUrl });
      set({
        nowPlaying: {
          id: `episode-${episode.id}`,
          title: episode.title,
          subtitle: episode.show.name,
          isLive: false,
          showName: episode.show.name,
          showSlug: episode.show.slug,
          artworkUrl: episode.show.imageUrl,
          description: episode.description,
          startDate: episode.startDate,
          endDate: episode.endDate,
          externalLinks: episode.show.external,
        },
      });
    } catch {
      set({ playbackState: 'error' });
    }
  },

  togglePlayPause: async () => {
    const { playbackState } = get();
    if (playbackState === 'playing') {
      await pausePlayback();
      set({ playbackState: 'paused' });
    } else if (playbackState === 'paused' || playbackState === 'error') {
      // 'error' here is a non-live track (e.g. a podcast episode) that
      // failed mid-stream - the track is still loaded, so retrying just
      // means asking the native player to try playing it again.
      set({ playbackState: 'loading' });
      await resumePlayback();
    }
  },

  pause: async () => {
    if (get().playbackState !== 'playing') return;
    await pausePlayback();
    set({ playbackState: 'paused' });
  },

  resume: async () => {
    if (get().playbackState !== 'paused') return;
    set({ playbackState: 'loading' });
    await resumePlayback();
  },

  stop: async () => {
    stopNowPlayingPoll();
    await stopPlayback();
    set({ playbackState: 'stopped', nowPlaying: null });
  },

  seekTo: async (positionSeconds) => {
    await seekToService(positionSeconds);
  },

  seekBy: async (offsetSeconds) => {
    await seekByService(offsetSeconds);
  },

  // Learns (within one poll interval - see radioService's KICK_POLL_MS)
  // when a station moderator has ended this listener's session, and stops
  // playback locally to match what the backend already recorded.
  initKickWatcher: () => {
    if (kickWatcherStarted) return;
    kickWatcherStarted = true;
    registerKickWatcher(() => {
      stopNowPlayingPoll();
      set({ playbackState: 'stopped', nowPlaying: null, kicked: true });
    });
  },

  // Wires the Firestick app's 5-attempt/3s auto-reconnect logic to this store
  // so the mini-player UI reflects reconnect failures.
  initReconnectWatcher: () => {
    if (reconnectWatcherStarted) return;
    reconnectWatcherStarted = true;
    registerReconnectHandler(() => {
      set({ playbackState: 'error', reconnectFailed: true });
    });
  },

  // Keeps the mini-player's play/pause UI in sync when Android auto-pauses
  // playback for us (another app taking audio focus) - the native layer
  // already stops the audio, this just reflects that state in the UI.
  initAudioInterruptionWatcher: () => {
    if (audioInterruptionWatcherStarted) return;
    audioInterruptionWatcherStarted = true;
    registerAudioInterruptionHandler((permanent) => {
      if (get().playbackState !== 'playing') return;
      set(permanent ? { playbackState: 'stopped', nowPlaying: null } : { playbackState: 'paused' });
    });
  },

  // Single source of truth for playbackState: reflects what the native
  // player is actually doing, instead of the optimistic guesses the play/
  // resume actions used to make. This is what makes a dead/weak network
  // correctly show "loading" (or eventually "error") instead of a stuck
  // "playing" state with no audio.
  initPlaybackStateWatcher: () => {
    if (playbackStateWatcherStarted) return;
    playbackStateWatcherStarted = true;
    registerPlaybackStateHandler((nativeState) => {
      const mapped = mapNativeState(nativeState);
      if (!mapped) return;
      set({ playbackState: mapped });
    });
  },
}));
