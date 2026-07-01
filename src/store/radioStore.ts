import { create } from 'zustand';
import { PlaybackState } from '../types';
import {
  playLiveStream,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  playEpisode as playEpisodeService,
  registerReconnectHandler,
} from '../services/radioService';

interface NowPlaying {
  id: string;
  title: string;
  subtitle: string;
  isLive: boolean;
}

interface RadioState {
  playbackState: PlaybackState;
  nowPlaying: NowPlaying | null;
  reconnectFailed: boolean;
  playLive: () => Promise<void>;
  playPodcastEpisode: (episode: { id: string | number; title: string; url: string }) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stop: () => Promise<void>;
  initReconnectWatcher: () => void;
}

let reconnectWatcherStarted = false;

export const useRadioStore = create<RadioState>((set, get) => ({
  playbackState: 'stopped',
  nowPlaying: null,
  reconnectFailed: false,

  playLive: async () => {
    set({ playbackState: 'loading', reconnectFailed: false });
    try {
      await playLiveStream();
      set({
        playbackState: 'playing',
        nowPlaying: { id: 'live-stream', title: 'Live Broadcast', subtitle: 'GhanaTalksRadio', isLive: true },
      });
    } catch {
      set({ playbackState: 'error' });
    }
  },

  playPodcastEpisode: async (episode) => {
    set({ playbackState: 'loading', reconnectFailed: false });
    try {
      await playEpisodeService(episode);
      set({
        playbackState: 'playing',
        nowPlaying: { id: `episode-${episode.id}`, title: episode.title, subtitle: 'Podcast', isLive: false },
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
    } else if (playbackState === 'paused') {
      await resumePlayback();
      set({ playbackState: 'playing' });
    }
  },

  stop: async () => {
    await stopPlayback();
    set({ playbackState: 'stopped', nowPlaying: null });
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
}));
