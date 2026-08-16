import { isPlayableAudioUrl } from '../utils/podcastContent';
import type { PodcastEpisode, PodcastEpisodeRaw, PodcastSeriesRaw, PodcastShow } from '../types/podcast';
import { STREAMING_API_BASE_URL } from './streamingApi';

/**
 * ghanatalksradio-portal's Modules/Podcast (see PublicPodcastController) -
 * replaces the legacy dev.ghanatalksradio.com podcast/catchup API. Real
 * per-show and per-episode endpoints exist now, so this file is a lot
 * simpler than its predecessor: no more scanning the global feed
 * client-side to find one show's episodes or one specific episode.
 */
export const PODCAST_API_BASE_URL = `${STREAMING_API_BASE_URL}/api/podcasts`;

export class PodcastApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PodcastApiError';
    this.status = status;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${PODCAST_API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  } catch (networkErr) {
    throw new PodcastApiError(`Network error reaching podcast API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json) {
    throw new PodcastApiError(`Podcast API request failed (${response.status})`, response.status);
  }
  if (json.status === false) {
    throw new PodcastApiError(json.message || 'Podcast API returned an error', 200);
  }
  return json.data as T;
}

function toShow(series: PodcastSeriesRaw): PodcastShow {
  return {
    id: series.slug,
    name: series.name,
    imageUrl: series.image_url,
    slug: series.slug,
    external: series.external_links ?? {},
  };
}

function toEpisode(episode: PodcastEpisodeRaw, show: PodcastShow): PodcastEpisode {
  const audioUrl = episode.audio_url && isPlayableAudioUrl(episode.audio_url) ? episode.audio_url : null;

  return {
    id: `${show.slug}-${episode.slug}`,
    showId: show.slug,
    startDate: episode.published_at ?? '',
    endDate: '',
    audioUrl,
    description: episode.description?.trim() ?? '',
    title: episode.title?.trim() ?? 'Untitled episode',
    slug: episode.slug,
    external: episode.external_links ?? {},
    show,
  };
}

export interface PodcastPage {
  episodes: PodcastEpisode[];
  page: number;
  hasMore: boolean;
}

/** Recent episodes across every show, newest first - GET /podcasts/episodes/{page}. */
export async function getPodcastEpisodes(page: number = 1): Promise<PodcastPage> {
  const data = await apiGet<{
    episodes: Array<{ episode: PodcastEpisodeRaw; series: PodcastSeriesRaw }>;
    page: number;
    has_more: boolean;
  }>(`/episodes/${page}`);

  return {
    episodes: data.episodes.map((item) => toEpisode(item.episode, toShow(item.series))),
    page: data.page,
    hasMore: data.has_more,
  };
}

export interface ShowEpisodesPage {
  episodes: PodcastEpisode[];
  show: PodcastShow | null;
  hasMore: boolean;
  searchExhausted: boolean;
}

const SHOW_PAGE_SIZE = 10;

/** All episodes for one show - GET /podcasts/{slug} returns the full list
 * (the backend doesn't paginate per-show, there's no need to at today's
 * volume), paginated client-side to match the screen's existing
 * page-at-a-time UI. `searchExhausted` is always false now - there's
 * nothing to give up searching for, the backend just tells us directly
 * if the show doesn't exist. */
export async function getPodcastEpisodesByShowSlug(
  showSlug: string,
  page: number = 1
): Promise<ShowEpisodesPage> {
  let data: { series: PodcastSeriesRaw; episodes: PodcastEpisodeRaw[] };
  try {
    data = await apiGet(`/${encodeURIComponent(showSlug)}`);
  } catch (err) {
    if (err instanceof PodcastApiError) {
      return { episodes: [], show: null, hasMore: false, searchExhausted: false };
    }
    throw err;
  }

  const show = toShow(data.series);
  const allEpisodes = data.episodes.map((e) => toEpisode(e, show));

  const start = (page - 1) * SHOW_PAGE_SIZE;
  const pageItems = allEpisodes.slice(start, start + SHOW_PAGE_SIZE);

  return {
    episodes: pageItems,
    show,
    hasMore: allEpisodes.length > start + SHOW_PAGE_SIZE,
    searchExhausted: false,
  };
}

export interface EpisodeLookupResult {
  episode: PodcastEpisode | null;
  searchExhausted: boolean;
}

/** One episode by show slug + episode slug - GET /podcasts/{slug}/episodes/{episodeSlug}. */
export async function getPodcastEpisodeBySlug(
  showSlug: string,
  episodeSlug: string
): Promise<EpisodeLookupResult> {
  try {
    const data = await apiGet<{ series: PodcastSeriesRaw; episode: PodcastEpisodeRaw }>(
      `/${encodeURIComponent(showSlug)}/episodes/${encodeURIComponent(episodeSlug)}`
    );
    return { episode: toEpisode(data.episode, toShow(data.series)), searchExhausted: false };
  } catch (err) {
    if (err instanceof PodcastApiError) {
      return { episode: null, searchExhausted: false };
    }
    throw err;
  }
}

/** Every published show - GET /podcasts. A real listing now, not a
 * derived guess from scanning recent episodes. */
export async function fetchPodcastShowList(): Promise<PodcastShow[]> {
  const data = await apiGet<{ series: PodcastSeriesRaw[] }>('');
  return data.series.map(toShow);
}
