import { normalizePodcastItem2 } from '../utils/podcastContent';
import type { PodcastEpisode } from '../types/podcast';

/**
 * Confirmed live base URL for the podcast/catchup API. Separate PHP backend
 * from the WordPress REST API used elsewhere - different domain, different
 * conventions (path-segment pagination, not query params).
 */
export const PODCAST_API_BASE_URL = 'https://dev.ghanatalksradio.com/index.php/api/podcast';

export class PodcastApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PodcastApiError';
    this.status = status;
  }
}

export interface PodcastPage {
  episodes: PodcastEpisode[];
  page: number;
  /** True if this page came back with a full page of results, suggesting a
   * next page likely exists. The API gives no total count, so this is a
   * heuristic, not a guarantee - same as the web version. */
  hasMore: boolean;
}

const PAGE_SIZE = 10; // Confirmed: both page 1 and page 2 returned exactly 10 items each.

/**
 * Fetches one page of podcast episodes. Pagination is a path segment
 * (/index.php/api/podcast/{page}/), not a query string param.
 */
export async function getPodcastEpisodes(page: number = 1): Promise<PodcastPage> {
  const url = `${PODCAST_API_BASE_URL}/${page}/`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (networkErr) {
    throw new PodcastApiError(
      `Network error reaching podcast API: ${(networkErr as Error).message}`,
      0
    );
  }

  if (!response.ok) {
    throw new PodcastApiError(`Podcast API request failed (${response.status})`, response.status);
  }

  const json: any = await response.json();

  if (json?.status === false) {
    throw new PodcastApiError(json.message || 'Podcast API returned an error', 200);
  }

  // Defensive shape handling - the precise response envelope wasn't directly
  // verifiable from this sandbox (no network access to dev.ghanatalksradio.com).
  const rawItems: any[] = Array.isArray(json)
    ? json
    : json?.data ?? json?.episodes ?? json?.results ?? [];

  const episodes = rawItems.map(normalizePodcastItem2);

  return {
    episodes,
    page,
    hasMore: episodes.length >= PAGE_SIZE,
  };
}

export interface ShowEpisodesPage {
  episodes: PodcastEpisode[];
  show: PodcastEpisode['show'] | null;
  hasMore: boolean;
  searchExhausted: boolean;
}

/** Max pages to search through when looking up a single show/episode - there's
 * no per-show filter or single-episode endpoint on this API, only paginated
 * global listing, so this bounds how far back to dig before giving up. */
const MAX_LOOKUP_PAGES = 20; // ~200 episodes, roughly the last few weeks of broadcasts.

/**
 * Fetches one "page" of episodes for a specific show, by walking the global
 * paginated listing and collecting matches client-side (no per-show filter
 * param exists on this API).
 */
export async function getPodcastEpisodesByShowSlug(
  showSlug: string,
  page: number = 1
): Promise<ShowEpisodesPage> {
  const targetCount = page * PAGE_SIZE;
  const matches: PodcastEpisode[] = [];
  let show: PodcastEpisode['show'] | null = null;
  let globalPage = 1;
  let globalHasMore = true;

  while (matches.length < targetCount + 1 && globalHasMore && globalPage <= MAX_LOOKUP_PAGES) {
    const result = await getPodcastEpisodes(globalPage);
    for (const ep of result.episodes) {
      if (ep.show.slug === showSlug) {
        matches.push(ep);
        if (!show) show = ep.show;
      }
    }
    globalHasMore = result.hasMore;
    globalPage += 1;
  }

  const start = (page - 1) * PAGE_SIZE;
  const pageItems = matches.slice(start, start + PAGE_SIZE);
  const hasMore = matches.length > targetCount;

  return {
    episodes: pageItems,
    show,
    hasMore,
    searchExhausted: globalPage > MAX_LOOKUP_PAGES,
  };
}

export interface EpisodeLookupResult {
  episode: PodcastEpisode | null;
  searchExhausted: boolean;
}

/**
 * Finds one episode by show slug + episode slug, by paging through the
 * listing until a match turns up - there's no dedicated single-episode
 * endpoint on this backend.
 */
export async function getPodcastEpisodeBySlug(
  showSlug: string,
  episodeSlug: string
): Promise<EpisodeLookupResult> {
  for (let page = 1; page <= MAX_LOOKUP_PAGES; page++) {
    const { episodes, hasMore } = await getPodcastEpisodes(page);

    const match = episodes.find((ep) => ep.show.slug === showSlug && ep.slug === episodeSlug);
    if (match) {
      return { episode: match, searchExhausted: false };
    }
    if (!hasMore) {
      return { episode: null, searchExhausted: false };
    }
  }
  return { episode: null, searchExhausted: true };
}

/** Derives the distinct list of shows present across a set of episodes. */
export function extractShowsFromEpisodes(episodes: PodcastEpisode[]) {
  const seen = new Map<string, PodcastEpisode['show']>();
  for (const ep of episodes) {
    if (!seen.has(ep.show.id)) {
      seen.set(ep.show.id, ep.show);
    }
  }
  return Array.from(seen.values());
}
