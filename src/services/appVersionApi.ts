import { Platform } from 'react-native';
import { STREAMING_API_BASE_URL } from './streamingApi';

/**
 * What the app calls on launch to find out what to do about its own
 * version - see PublicAppVersionController on the Laravel side and the
 * App Releases admin page (AppReleasesIndex) that feeds it. Two distinct
 * signals, not one: `update_available` (show a dismissible nag) and
 * `force_update` (block outright - below the registered minimum version,
 * OR the grace period on a past "latest version" has elapsed). The app
 * never needs its own copy of the grace-period math - force_update is
 * already the final answer, computed server-side.
 */
export interface AppVersionCheckResult {
  platform: 'android' | 'ios';
  current_version: string;
  latest_version: string | null;
  minimum_version: string | null;
  store_url: string | null;
  release_notes: string | null;
  update_available: boolean;
  force_update: boolean;
  grace_period_ends_at: string | null;
}

const REQUEST_TIMEOUT_MS = 4000;

/** Best-effort, time-boxed like every other call to this backend - a
 * slow/unreachable server must never block the app from opening. Callers
 * should treat a thrown error as "nothing to report", not as an update
 * being required. */
export async function checkAppVersion(version: string): Promise<AppVersionCheckResult> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${STREAMING_API_BASE_URL}/api/app/version-check?platform=${platform}&version=${encodeURIComponent(version)}`,
      { headers: { Accept: 'application/json' }, signal: controller.signal }
    );
    const json = await response.json();
    if (!response.ok || json.status !== true) {
      throw new Error(json?.message || `Version check failed (${response.status})`);
    }
    return json.data as AppVersionCheckResult;
  } finally {
    clearTimeout(timeout);
  }
}
