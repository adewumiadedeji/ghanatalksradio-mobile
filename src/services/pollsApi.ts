/**
 * Polls API - ghanatalksradio-portal's Modules/Engagement (see
 * PublicPollController), the sole backend for polls now. Previously this
 * file split dev/prod between this Laravel backend and the legacy
 * dev.ghanatalksradio.com CodeIgniter host; that split is gone now that
 * dev.ghanatalksradio.com is being fully retired.
 *
 * `votes` per option can be `null` (not 0!) when Engagement's
 * `hide_results_until_closed` is on for that poll and it hasn't closed
 * yet - PublicPollController deliberately omits the real count in that
 * case (PollOption.vote_count -> null). Collapsing that into 0 would make
 * "results are hidden" look identical to "nobody's voted", so it's
 * preserved as null all the way to DiscoverScreen, which should only
 * render a percentage bar when it has a real number to show.
 *
 * `your_option_id`: Engagement's response never echoes back which option
 * you voted for on a plain GET (PublicPollController::detailArray() has
 * no such field, only the vote() call's own response says what was just
 * recorded). Without remembering this client-side, a refresh made the
 * poll look not-yet-voted again (percentage/fill UI hidden, options
 * tappable), and tapping an option again failed against
 * PollVotingException's "You have already voted in this poll." with no
 * visible feedback - see utils/pollVotes.ts for the persisted fix.
 */
import { STREAMING_API_BASE_URL } from './streamingApi';
import { getVotedOptions, recordVote } from '../utils/pollVotes';

const API_BASE_URL = `${STREAMING_API_BASE_URL}/api`;

export class PollsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PollsApiError';
    this.status = status;
  }
}

export interface PollSponsorDto {
  name: string;
}

export interface PollOptionDto {
  id: number;
  text: string;
  /** null means results are currently hidden (see this file's docblock) - not "zero votes". */
  votes: number | null;
}

export interface PollDto {
  id: string;
  question: string;
  reward_points: number;
  options: PollOptionDto[];
  your_option_id: number | null;
  sponsor: PollSponsorDto | null;
}

interface LaravelPollOption {
  id: number;
  label: string;
  vote_count: number | null;
}

interface LaravelPoll {
  slug: string;
  question: string;
  options: LaravelPollOption[];
  sponsor: PollSponsorDto | null;
}

function fromLaravelPoll(poll: LaravelPoll, yourOptionId: number | null = null): PollDto {
  return {
    id: poll.slug,
    question: poll.question,
    reward_points: 0,
    options: poll.options.map((o) => ({ id: o.id, text: o.label, votes: o.vote_count })),
    your_option_id: yourOptionId,
    sponsor: poll.sponsor ?? null,
  };
}

async function apiGet(path: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  } catch (networkErr) {
    throw new PollsApiError(`Network error reaching polls API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new PollsApiError(json?.message || `Polls API request failed (${response.status})`, response.status);
  }
  return json.data;
}

async function apiPost(path: string, body: Record<string, unknown>, token?: string | null): Promise<any> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (networkErr) {
    throw new PollsApiError(`Network error reaching polls API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new PollsApiError(json?.message || `Polls API request failed (${response.status})`, response.status);
  }
  return json.data;
}

// A poll that doesn't require a signed-in voter still needs SOME stable
// per-device identity to prevent trivial repeat voting (see
// PublicPollController's docblock: "no CAPTCHA/device fingerprinting
// service configured to do this more robustly"). One random token,
// generated once and reused for every anonymous vote this install makes.
let cachedGuestToken: string | null = null;
function guestToken(): string {
  if (!cachedGuestToken) {
    cachedGuestToken = `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return cachedGuestToken;
}

export async function fetchPollList(_token?: string | null): Promise<PollDto[]> {
  // /polls only returns summaries (no options - see
  // PublicPollController::summaryArray()); the full option/vote-count
  // data DiscoverScreen renders only comes from /polls/{slug} (show()'s
  // detailArray()). Fetched in parallel per poll rather than adding a
  // second, wider list endpoint that doesn't exist on the backend.
  const { polls } = await apiGet('/polls');
  const details = await Promise.all(
    (polls as Array<{ slug: string }>).map((p) => apiGet(`/polls/${encodeURIComponent(p.slug)}`))
  );
  const votedOptions = await getVotedOptions((details as LaravelPoll[]).map((p) => p.slug));
  return (details as LaravelPoll[]).map((p) => fromLaravelPoll(p, votedOptions[p.slug] ?? null));
}

export async function voteOnPoll(token: string, pollId: string, optionId: number): Promise<PollDto> {
  let data: LaravelPoll;
  try {
    data = await apiPost(`/polls/${encodeURIComponent(pollId)}/vote`, {
      option_ids: [optionId],
      guest_token: token ? undefined : guestToken(),
    }, token) as LaravelPoll;
  } catch (err) {
    // Cross-device/reinstall edge case: the backend remembers this voter
    // already voted even though this device's local record of it
    // (utils/pollVotes.ts) is gone. Nothing to recover locally here -
    // just a clearer error than a silent no-op for the caller to show.
    if (err instanceof PollsApiError && /already voted/i.test(err.message)) {
      throw new PollsApiError('You have already voted in this poll.', err.status);
    }
    throw err;
  }
  await recordVote(pollId, optionId);
  return fromLaravelPoll(data, optionId);
}
