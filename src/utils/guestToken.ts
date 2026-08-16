import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gtr_guest_token_v1';

/**
 * Stable per-device identity for Engagement features that accept an
 * anonymous `guest_token` in place of a bearer token (polls/raffles/
 * quizzes/predictions - see each PublicXController's docblock: "no
 * CAPTCHA/device fingerprinting service configured to do this more
 * robustly"). Persisted so a guest's participation is recognized as the
 * same guest across app restarts, not a fresh one every launch.
 */
let cached: string | null = null;

export async function getGuestToken(): Promise<string> {
  if (cached) return cached;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }
  const generated = `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(STORAGE_KEY, generated);
  cached = generated;
  return generated;
}
