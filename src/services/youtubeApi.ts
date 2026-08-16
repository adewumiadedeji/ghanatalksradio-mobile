import { STREAMING_API_BASE_URL } from './streamingApi';

/**
 * YouTube live + recent-videos API - ghanatalksradio-portal's
 * App\Http\Controllers\Api\YoutubeController, a faithful port of the
 * legacy dev.ghanatalksradio.com implementation (same real YouTube Data
 * API v3 calls, same quota-avoidance strategy via /playlistItems instead
 * of /search for pagination, same cache/stale-fallback behavior) -
 * identical response envelope, so this was a drop-in URL change. Public,
 * no auth required.
 */
export const YOUTUBE_API_BASE_URL = `${STREAMING_API_BASE_URL}/api`;

export class YoutubeApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'YoutubeApiError';
    this.status = status;
  }
}

export interface YoutubeVideoDto {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

export interface YoutubeVideosPage {
  live: YoutubeVideoDto[];
  videos: YoutubeVideoDto[];
  nextPageToken: string | null;
}

export async function fetchYoutubeVideos(pageToken?: string): Promise<YoutubeVideosPage> {
  const query = pageToken ? `?page_token=${encodeURIComponent(pageToken)}` : '';

  let response: Response;
  try {
    response = await fetch(`${YOUTUBE_API_BASE_URL}/youtube/videos${query}`, {
      headers: { Accept: 'application/json' },
    });
  } catch (networkErr) {
    throw new YoutubeApiError(`Network error reaching YouTube API: ${(networkErr as Error).message}`, 0);
  }

  if (!response.ok) {
    throw new YoutubeApiError(`YouTube API request failed (${response.status})`, response.status);
  }

  const json = await response.json();
  if (json?.status !== true) {
    throw new YoutubeApiError(json?.message || 'YouTube API returned an error', 200);
  }

  return {
    live: json.data.live,
    videos: json.data.videos,
    nextPageToken: json.data.next_page_token,
  };
}
