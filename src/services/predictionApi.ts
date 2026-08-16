/**
 * Prediction game API - ghanatalksradio-portal's Modules/Engagement (see
 * PublicPredictionController). Always talks to the Laravel backend (same
 * STREAMING_API_BASE_URL/__DEV__ split as streamingApi.ts) - predictions
 * are new to this platform, no legacy equivalent.
 */
import { STREAMING_API_BASE_URL } from './streamingApi';

const API_BASE_URL = `${STREAMING_API_BASE_URL}/api`;

export class PredictionApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PredictionApiError';
    this.status = status;
  }
}

export interface PredictionSummaryDto {
  slug: string;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  requires_registered_user: boolean;
  status: string;
}

export interface FixtureDto {
  id: number;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: string;
  actual_home_score: number | null;
  actual_away_score: number | null;
  predictions_open: boolean;
}

export interface MyPredictionDto {
  fixture_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  points_awarded: number | null;
}

export interface PredictionDetailDto extends PredictionSummaryDto {
  fixtures: FixtureDto[];
  my_predictions: MyPredictionDto[];
}

export interface PredictResultDto {
  fixture_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
}

export interface CommentDto {
  id: number;
  author: string;
  body: string;
  created_at: string;
  is_registered: boolean;
}

export interface CommentsPageDto {
  comments: CommentDto[];
  page: number;
  per_page: number;
  total: number;
  has_more: boolean;
}

async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  } catch (networkErr) {
    throw new PredictionApiError(`Network error reaching prediction API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new PredictionApiError(json?.message || `Prediction API request failed (${response.status})`, response.status);
  }
  return json.data as T;
}

async function apiPost<T>(path: string, body: Record<string, unknown>, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (networkErr) {
    throw new PredictionApiError(`Network error reaching prediction API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new PredictionApiError(json?.message || `Prediction API request failed (${response.status})`, response.status);
  }
  return json.data as T;
}

export async function fetchPredictionList(): Promise<PredictionSummaryDto[]> {
  const data = await apiGet<{ predictions: PredictionSummaryDto[] }>('/predictions');
  return data.predictions;
}

/** `my_predictions` in the response is only populated when a token or
 * guestToken is supplied (see PublicPredictionController::show()) -
 * pass whichever identity the caller has. */
export async function fetchPredictionDetail(
  slug: string,
  token?: string | null,
  guestToken?: string
): Promise<PredictionDetailDto> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const query = !token && guestToken ? `?guest_token=${encodeURIComponent(guestToken)}` : '';

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/predictions/${encodeURIComponent(slug)}${query}`, { headers });
  } catch (networkErr) {
    throw new PredictionApiError(`Network error reaching prediction API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new PredictionApiError(json?.message || `Prediction API request failed (${response.status})`, response.status);
  }
  return json.data as PredictionDetailDto;
}

export async function predictFixture(
  slug: string,
  fixtureId: number,
  predictedHomeScore: number,
  predictedAwayScore: number,
  token?: string | null,
  guestToken?: string
): Promise<PredictResultDto> {
  return apiPost<PredictResultDto>(
    `/predictions/${encodeURIComponent(slug)}/fixtures/${fixtureId}/predict`,
    {
      predicted_home_score: predictedHomeScore,
      predicted_away_score: predictedAwayScore,
      guest_token: token ? undefined : guestToken,
    },
    token
  );
}

/** Oldest-first, page 1 = oldest. Scrolling toward the bottom of an
 * already-loaded page requests the next one (see PredictionsScreen's
 * comments modal `onEndReached`). */
export async function fetchComments(slug: string, fixtureId: number, page: number = 1): Promise<CommentsPageDto> {
  return apiGet<CommentsPageDto>(
    `/predictions/${encodeURIComponent(slug)}/fixtures/${fixtureId}/comments?page=${page}`
  );
}

export async function postComment(
  slug: string,
  fixtureId: number,
  body: string,
  token?: string | null,
  guestToken?: string,
  guestName?: string
): Promise<CommentDto> {
  const data = await apiPost<{ comment: CommentDto }>(
    `/predictions/${encodeURIComponent(slug)}/fixtures/${fixtureId}/comments`,
    {
      body,
      guest_token: token ? undefined : guestToken,
      guest_name: token ? undefined : guestName,
    },
    token
  );
  return data.comment;
}
