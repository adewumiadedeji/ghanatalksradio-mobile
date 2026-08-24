import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'gtr_device_id_v1';

/**
 * Persistent, non-expiring per-device identity generated once on first
 * launch and reused for as long as the app stays installed - same
 * persisted-in-AsyncStorage shape as guestToken.ts's guest_token, but a
 * separate identifier: this one is sent with every listening session (see
 * streamingApi.ts's startListeningSession()) so the backend's
 * closeDanglingSessions() can tell "this device reconnected" apart from
 * "a different device on the same shared IP" (see that method's own
 * docblock for the bug this fixes - two phones on the same home WiFi
 * were wrongly closing each other's live sessions). Only resets on
 * uninstall/reinstall or a fresh device - there's no way around that from
 * client-side storage alone, and nothing further-reaching (like a
 * hardware identifier) is being used here.
 */
let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }
  const generated = uuidv4();
  await AsyncStorage.setItem(STORAGE_KEY, generated);
  cached = generated;
  return generated;
}
