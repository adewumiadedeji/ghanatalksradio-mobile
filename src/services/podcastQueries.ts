import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  getPodcastEpisodes,
  getPodcastEpisodeBySlug,
  getPodcastEpisodesByShowSlug,
  extractShowsFromEpisodes,
  type PodcastPage
} from './podcastApi';

const STALE_TIME = 5 * 60 * 1000; // 5 min — new episodes publish daily, not minute-by-minute
const SHOW_LIST_STALE_TIME = 30 * 60 * 1000; // 30 min — the set of distinct shows changes far less often than episodes do

export function usePodcastEpisodes(page: number = 1) {
  return useQuery({
    queryKey: ['podcasts', 'episodes', page],
    queryFn: () => getPodcastEpisodes(page),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

/**
 * Looks up a single episode by show slug + episode slug for the detail
 * page (/podcast/:showSlug/:episodeSlug). There's no direct API endpoint
 * for this — it pages through the listing under the hood, bounded so it
 * doesn't search forever (see getPodcastEpisodeBySlug).
 */
export function usePodcastEpisode(showSlug: string | undefined, episodeSlug: string | undefined) {
  return useQuery({
    queryKey: ['podcasts', 'episode', showSlug, episodeSlug],
    queryFn: () => getPodcastEpisodeBySlug(showSlug as string, episodeSlug as string),
    enabled: Boolean(showSlug && episodeSlug),
    staleTime: STALE_TIME,
  });
}

/**
 * All episodes for one show (/podcast/:showSlug), paginated. Confirmed
 * live: shows are identified by their own `details.name` → `details.slug`
 * on the podcast API (e.g. "ghanatalks-breakfast-show"), distinct from
 * each episode's own slug.
 */
export function usePodcastShowEpisodes(showSlug: string | undefined, page: number = 1) {
  return useQuery({
    queryKey: ['podcasts', 'show', showSlug, page],
    queryFn: () => getPodcastEpisodesByShowSlug(showSlug as string, page),
    enabled: Boolean(showSlug),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

/**
 * All distinct shows derived from the most recent few pages of episodes —
 * used to populate the "Podcast" nav dropdown. There's no dedicated "list
 * shows" endpoint on this backend, only paginated episode listings, so
 * this scans a bounded number of pages and dedupes by show id. A handful
 * of pages is enough in practice: there are only a small number of
 * distinct shows even though episode volume is high (some shows publish
 * multiple times a day), so new shows surface quickly without needing to
 * scan deep into history.
 */
const SHOW_LIST_SCAN_PAGES = 8;

export function usePodcastShowList() {
  return useQuery({
    queryKey: ['podcasts', 'show-list', SHOW_LIST_SCAN_PAGES],
    queryFn: async () => {
      // allSettled rather than all: if one page request fails (network
      // blip, etc.), shows found on the other successfully-fetched pages
      // should still surface rather than the whole list failing because
      // of a single bad page.
      const results = await Promise.allSettled(
        Array.from({ length: SHOW_LIST_SCAN_PAGES }, (_, i) => getPodcastEpisodes(i + 1))
      );
      const allEpisodes = results
        .filter((r): r is PromiseFulfilledResult<PodcastPage> => r.status === 'fulfilled')
        .flatMap((r) => r.value.episodes);
      return extractShowsFromEpisodes(allEpisodes);
    },
    staleTime: SHOW_LIST_STALE_TIME,
  });
}