/**
 * GhanaTalksRadio's own Laravel backend (ghanatalksradio-portal) - a
 * separate system from the legacy dev.ghanatalksradio.com CodeIgniter API
 * used elsewhere in this app (podcasts/auth/raffles/polls) and from the
 * WordPress REST API (news). This is the first feature wired to it: live
 * listening session tracking (populates the admin panel's Live Listeners
 * map) + regional stream mount resolution. See that backend's
 * PublicListenController and StreamMountController.
 *
 * Sessions are guest (anonymous) by default - that's a fully supported,
 * intentional case server-side (user_id is nullable) - but callers that
 * have a signed-in user's token should pass it through so
 * PublicListenController::resolveUserId() can attribute the session to a
 * real account instead. radioService.ts's playLiveStream() is the one
 * that actually reads the current session from userStore and passes it
 * along.
 */

// iOS Simulator: localhost works as-is (shares the Mac's network).
// Android Emulator: use 10.0.2.2 instead of localhost.
// Physical device (either OS): use your Mac's LAN IP instead - "localhost"
// on a physical device means the device itself, not your Mac.
const LOCAL_DEV_URL = 'https://app.ghanatalksradio.com';
const PROD_URL = 'https://app.ghanatalksradio.com';

export const STREAMING_API_BASE_URL = __DEV__ ? LOCAL_DEV_URL : PROD_URL;

// Matches the backend's governing rule for every LiquidSoap-facing call
// (docs/architecture/07-liquidsoap-integration-guide.md §0) - a slow or
// down platform must never hang something the listener is waiting on, so
// every call here is time-boxed and fails soft.
const REQUEST_TIMEOUT_MS = 4000;

export class StreamingApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'StreamingApiError';
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function callApi<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${STREAMING_API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (err) {
    const aborted = (err as Error).name === 'AbortError';
    throw new StreamingApiError(
      aborted ? 'Streaming API request timed out' : `Network error reaching streaming API: ${(err as Error).message}`,
      0
    );
  } finally {
    clearTimeout(timeout);
  }

  const json: ApiEnvelope<T> = await response.json();

  if (!response.ok || json.status === false) {
    throw new StreamingApiError(json.message || `Streaming API request failed (${response.status})`, response.status);
  }

  return json.data;
}

export interface StreamMount {
  region: string;
  stream_url: string;
}

/** Resolves the right regional Icecast mount for a listener - the backend
 * falls back to its own configured default mount if region is omitted or
 * unrecognized (only one mount exists today, but this stays region-aware
 * so nothing needs to change here once more are configured). */
export async function resolveStreamMount(region?: string): Promise<StreamMount> {
  const query = region ? `?region=${encodeURIComponent(region)}` : '';
  return callApi<StreamMount>(`/api/listen/mount${query}`);
}

export interface StartSessionParams {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

/** Registers a listening session server-side. Returns a session_token that
 * must be passed to stopListeningSession() when playback actually stops.
 * Pass the signed-in user's token (if any) so the session is attributed
 * to their account instead of showing as a guest on the admin's Live
 * Listeners screen - PublicListenController::resolveUserId() reads it
 * the same way EnsureAccountAuthenticated does, via the Authorization
 * header only (no query-param fallback like the legacy CI backend). */
export async function startListeningSession(params: StartSessionParams = {}, token?: string | null): Promise<string> {
  const data = await callApi<{ session_token: string }>('/api/listen/start', {
    method: 'POST',
    body: JSON.stringify({ platform: 'mobile', ...params }),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data.session_token;
}

export interface SessionStatus {
  active: boolean;
  kicked: boolean;
}

/** Polled while the live stream plays (see radioService's kick watcher) -
 * there's no real-time push from this backend into the app (see
 * PublicListenController's docblock on the Laravel side for why: this
 * app was never in the actual audio path, so it can only affect clients
 * that ask it directly, on whatever cadence they ask). A staff Kick/Ban
 * shows up here within one poll interval, not instantly. */
export async function getSessionStatus(sessionToken: string): Promise<SessionStatus> {
  return callApi<SessionStatus>(`/api/listen/status?session_token=${encodeURIComponent(sessionToken)}`);
}

export async function stopListeningSession(sessionToken: string): Promise<void> {
  await callApi('/api/listen/stop', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken }),
  });
}

export interface NowPlayingProgramme {
  name: string;
  description: string | null;
  presenter: string | null;
  day_of_week: string | null;
  start_time: string;
  end_time: string;
}

/** What's on the published schedule right now - null means nothing's
 * currently scheduled (the actual audio keeps playing regardless via
 * LiquidSoap's own fallback chain; this is metadata only). */
export async function getNowPlaying(): Promise<NowPlayingProgramme | null> {
  const data = await callApi<{ programme: NowPlayingProgramme | null }>('/api/now-playing');
  return data.programme;
}

/** Is a presenter actually on air right now (the manual Go live/End
 * broadcast toggle staff use in Admin > Broadcast > Studio Sessions) -
 * distinct from getNowPlaying(), which answers "what *should* be airing"
 * from the published schedule. The stream itself never goes silent
 * between shows (see LiquidSoap's fallback chain), so this is purely a
 * "is someone actually presenting" indicator, e.g. for the Podcast
 * screen's LIVE NOW card. */
export async function getBroadcastStatus(): Promise<boolean> {
  const data = await callApi<{ is_live: boolean }>('/api/broadcast/status');
  return data.is_live;
}
