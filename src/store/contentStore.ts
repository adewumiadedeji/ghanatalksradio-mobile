import { create } from 'zustand';
import { Raffle, Poll } from '../types';
import { MOCK_RAFFLES, MOCK_POLLS, RECENT_WINNERS } from '../data/mockData';

// Articles are no longer stored here - News/Discover/Profile read live from
// WordPress via src/services/queries.ts. Raffles and polls have no WordPress
// equivalent, so they remain local mock state pending a real backend.
interface ContentState {
  raffles: Raffle[];
  polls: Poll[];
  recentWinners: string[];
  votePoll: (pollId: string, optionIndex: number) => void;
  enterRaffle: (raffleId: string, tickets: number) => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
  raffles: MOCK_RAFFLES,
  polls: MOCK_POLLS,
  recentWinners: RECENT_WINNERS,

  votePoll: (pollId, optionIndex) => {
    set({
      polls: get().polls.map((p) => {
        if (p.id !== pollId || p.userVoteIndex !== undefined) return p;
        const options = p.options.map((o, i) =>
          i === optionIndex ? { ...o, votes: o.votes + 1 } : o
        );
        return { ...p, options, userVoteIndex: optionIndex };
      }),
    });
  },

  enterRaffle: (raffleId, tickets) => {
    set({
      raffles: get().raffles.map((r) =>
        r.id === raffleId ? { ...r, totalEntered: r.totalEntered + tickets } : r
      ),
    });
  },
}));
