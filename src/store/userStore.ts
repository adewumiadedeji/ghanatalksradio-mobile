import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserInfo, UserEntry } from '../types';

interface UserState {
  user: UserInfo | null;
  hasHydrated: boolean;
  setUser: (user: UserInfo | null) => void;
  login: (email: string, name: string) => void;
  signUp: (email: string, name: string) => void;
  logout: () => void;
  toggleBookmark: (articleId: string) => void;
  addPoints: (amount: number) => void;
  spendPoints: (amount: number) => boolean;
  addRaffleEntry: (entry: UserEntry) => void;
  setHasHydrated: (value: boolean) => void;
}

const INITIAL_POINTS = 2450;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),

      login: (email, name) => {
        const derivedName =
          name ||
          email
            .split('@')[0]
            .split(/[._-]/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        set({
          user: {
            name: derivedName,
            email,
            points: INITIAL_POINTS,
            isPremium: true,
            registeredAt: new Date().toISOString(),
            bookmarkedArticleIds: [],
            raffleEntries: [],
          },
        });
      },

      signUp: (email, name) => {
        set({
          user: {
            name,
            email,
            points: 1000, // matches web prototype's +1000 bonus for registering
            isPremium: true,
            registeredAt: new Date().toISOString(),
            bookmarkedArticleIds: [],
            raffleEntries: [],
          },
        });
      },

      logout: () => set({ user: null }),

      toggleBookmark: (articleId) => {
        const user = get().user;
        if (!user) return;
        const isBookmarked = user.bookmarkedArticleIds.includes(articleId);
        set({
          user: {
            ...user,
            bookmarkedArticleIds: isBookmarked
              ? user.bookmarkedArticleIds.filter((id) => id !== articleId)
              : [...user.bookmarkedArticleIds, articleId],
          },
        });
      },

      addPoints: (amount) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, points: user.points + amount } });
      },

      spendPoints: (amount) => {
        const user = get().user;
        if (!user || user.points < amount) return false;
        set({ user: { ...user, points: user.points - amount } });
        return true;
      },

      addRaffleEntry: (entry) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, raffleEntries: [...user.raffleEntries, entry] } });
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'gtr_user_v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
