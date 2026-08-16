/**
 * Leaderboard/points API - ghanatalksradio-portal's Modules/Engagement
 * (see PublicLeaderboardController). No mobile screen consumes this yet;
 * this is a ready-to-use client for whenever one's built. Always talks
 * to the Laravel backend (same STREAMING_API_BASE_URL/__DEV__ split as
 * streamingApi.ts) - points/leaderboards are new to this platform, no
 * legacy equivalent.
 */
import { STREAMING_API_BASE_URL } from './streamingApi';

const API_BASE_URL = `${STREAMING_API_BASE_URL}/api`;

export class LeaderboardApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'LeaderboardApiError';
    this.status = status;
  }
}

export interface LeaderboardEntryDto {
  name: string;
  points: number;
}

export interface PointTransactionDto {
  points: number;
  source: string;
  description: string | null;
  created_at: string;
}

export interface MyPointsDto {
  balance: number;
  recent_transactions: PointTransactionDto[];
}

export async function fetchLeaderboard(period: string = 'all-time'): Promise<LeaderboardEntryDto[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/leaderboard?period=${encodeURIComponent(period)}`, {
      headers: { Accept: 'application/json' },
    });
  } catch (networkErr) {
    throw new LeaderboardApiError(`Network error reaching leaderboard API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new LeaderboardApiError(json?.message || `Leaderboard API request failed (${response.status})`, response.status);
  }
  return (json.data as { leaderboard: LeaderboardEntryDto[] }).leaderboard;
}

/** Requires a signed-in user (`account.auth`) - a guest has no persistent
 * points balance to look up (see PublicLeaderboardController's docblock). */
export async function fetchMyPoints(token: string): Promise<MyPointsDto> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/my-points`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch (networkErr) {
    throw new LeaderboardApiError(`Network error reaching leaderboard API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new LeaderboardApiError(json?.message || `Leaderboard API request failed (${response.status})`, response.status);
  }
  return json.data as MyPointsDto;
}
