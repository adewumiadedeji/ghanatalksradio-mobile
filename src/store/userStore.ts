import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserInfo } from '../types';
import {
  registerUser,
  loginUser,
  logoutUser,
  fetchMe,
  resetPassword,
  confirmPasswordResetPin,
  changePassword as changePasswordApi,
  AuthResult,
} from '../services/authApi';

interface UserState {
  user: UserInfo | null;
  hasHydrated: boolean;
  setUser: (user: UserInfo | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  /** Finishes the forced-reset flow for a legacy account (see authApi's
   * PasswordResetRequiredError) - sets a new password and starts a
   * session, same as a normal login. */
  completeReset: (resetTicket: string, newPassword: string) => Promise<void>;
  /** Finishes the voluntary "forgot password" flow: validates the emailed
   * PIN server-side, sets a new password, and starts a session. */
  completeResetWithPin: (email: string, pin: string, newPassword: string) => Promise<void>;
  /** Changes the password for the currently-logged-in user, authenticated
   * via the existing session token rather than a reset ticket/PIN. */
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-checks a persisted token against the server on cold start; clears
   * the session locally if it's no longer valid (expired/logged out
   * elsewhere). No-op if there's no persisted user. */
  hydrateFromMe: () => Promise<void>;
  toggleBookmark: (articleId: string) => void;
  addPoints: (amount: number) => void;
  spendPoints: (amount: number) => boolean;
  setHasHydrated: (value: boolean) => void;
}

// Points/premium status have no backend yet - kept as cosmetic, locally
// fabricated values (not written back to the server) so existing Profile/
// Raffle UI referencing them doesn't need to change in this pass.
const INITIAL_POINTS = 2450;
const SIGNUP_BONUS_POINTS = 1000;

function toUserInfo(result: AuthResult, points: number): UserInfo {
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    phone: result.user.phone,
    token: result.token,
    points,
    isPremium: true,
    registeredAt: new Date().toISOString(),
    bookmarkedArticleIds: [],
  };
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),

      login: async (email, password) => {
        const result = await loginUser(email, password);
        set({ user: toUserInfo(result, INITIAL_POINTS) });
      },

      signUp: async (name, email, password, phone) => {
        const result = await registerUser(name, email, password, phone);
        set({ user: toUserInfo(result, SIGNUP_BONUS_POINTS) });
      },

      completeReset: async (resetTicket, newPassword) => {
        const result = await resetPassword(resetTicket, newPassword);
        set({ user: toUserInfo(result, INITIAL_POINTS) });
      },

      completeResetWithPin: async (email, pin, newPassword) => {
        const result = await confirmPasswordResetPin(email, pin, newPassword);
        set({ user: toUserInfo(result, INITIAL_POINTS) });
      },

      changePassword: async (newPassword) => {
        const user = get().user;
        if (!user) throw new Error('You must be signed in to change your password.');
        await changePasswordApi(user.token, newPassword);
      },

      logout: async () => {
        const token = get().user?.token;
        if (token) {
          try {
            await logoutUser(token);
          } catch {
            // Best-effort - always clear the local session regardless of
            // whether the server call succeeded.
          }
        }
        set({ user: null });
      },

      hydrateFromMe: async () => {
        const user = get().user;
        if (!user?.token) return;
        try {
          await fetchMe(user.token);
        } catch {
          // Token is invalid/expired server-side - drop the stale local session.
          set({ user: null });
        }
      },

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

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'gtr_user_v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.hydrateFromMe();
      },
    }
  )
);
