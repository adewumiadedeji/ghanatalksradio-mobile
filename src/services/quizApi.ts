/**
 * Quiz API - ghanatalksradio-portal's Modules/Engagement (see
 * PublicQuizController). No mobile screen consumes this yet; this is a
 * ready-to-use client for whenever one's built. Always talks to the
 * Laravel backend (same STREAMING_API_BASE_URL/__DEV__ split as
 * streamingApi.ts) - there's no legacy CodeIgniter equivalent to fall
 * back to, quizzes are new to this platform.
 */
import { STREAMING_API_BASE_URL } from './streamingApi';

const API_BASE_URL = `${STREAMING_API_BASE_URL}/api`;

export class QuizApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'QuizApiError';
    this.status = status;
  }
}

export interface QuizSummaryDto {
  slug: string;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  requires_registered_user: boolean;
  status: string;
}

export interface QuizChoiceDto {
  id: number;
  label: string;
}

export interface QuizQuestionDto {
  id: number;
  question_text: string;
  choices: QuizChoiceDto[];
}

export interface QuizDetailDto extends QuizSummaryDto {
  time_limit_seconds: number | null;
  questions: QuizQuestionDto[];
}

export interface QuizResultDto {
  score: number;
  total_possible: number;
}

async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  } catch (networkErr) {
    throw new QuizApiError(`Network error reaching quiz API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new QuizApiError(json?.message || `Quiz API request failed (${response.status})`, response.status);
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
    throw new QuizApiError(`Network error reaching quiz API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new QuizApiError(json?.message || `Quiz API request failed (${response.status})`, response.status);
  }
  return json.data as T;
}

export async function fetchQuizList(): Promise<QuizSummaryDto[]> {
  const data = await apiGet<{ quizzes: QuizSummaryDto[] }>('/quizzes');
  return data.quizzes;
}

export async function fetchQuizDetail(slug: string): Promise<QuizDetailDto> {
  return apiGet<QuizDetailDto>(`/quizzes/${encodeURIComponent(slug)}`);
}

/** `answers` maps question id -> chosen choice id. A registered voter
 * should pass their bearer token; an anonymous one must pass a
 * `guestToken` instead (see PublicQuizController's docblock - same
 * "optional bearer, guest_token fallback" pattern as polls/raffles). */
export async function submitQuiz(
  slug: string,
  answers: Record<number, number>,
  token?: string | null,
  guestToken?: string
): Promise<QuizResultDto> {
  return apiPost<QuizResultDto>(
    `/quizzes/${encodeURIComponent(slug)}/submit`,
    { answers, guest_token: token ? undefined : guestToken },
    token
  );
}
