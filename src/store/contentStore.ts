import { create } from 'zustand';
import { RECENT_WINNERS } from '../data/mockData';

// Articles are no longer stored here - News/Discover/Profile read live from
// WordPress via src/services/queries.ts. Raffles read live from the
// CodeIgniter backend via src/services/raffleQueries.ts (see RaffleScreen).
// Polls now read live from the backend too via src/services/pollsQueries.ts
// (see DiscoverScreen). Recent winners have no backend equivalent yet, so
// they remain local mock state.
interface ContentState {
  recentWinners: string[];
}

export const useContentStore = create<ContentState>(() => ({
  recentWinners: RECENT_WINNERS,
}));
