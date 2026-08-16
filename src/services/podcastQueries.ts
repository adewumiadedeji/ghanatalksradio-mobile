import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  getPodcastEpisodes,
  getPodcastEpisodeBySlug,
  getPodcastEpisodesByShowSlug,
  fetchPodcastShowList,
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

/** Looks up a single episode by show slug + episode slug for the detail
 * page (/podcast/:showSlug/:episodeSlug) - a real backend lookup now
 * (Modules/Podcast's per-episode endpoint), not a client-side search. */
export function usePodcastEpisode(showSlug: string | undefined, episodeSlug: string | undefined) {
  return useQuery({
    queryKey: ['podcasts', 'episode', showSlug, episodeSlug],
    queryFn: () => getPodcastEpisodeBySlug(showSlug as string, episodeSlug as string),
    enabled: Boolean(showSlug && episodeSlug),
    staleTime: STALE_TIME,
  });
}

/** All episodes for one show (/podcast/:showSlug), paginated. */
export function usePodcastShowEpisodes(showSlug: string | undefined, page: number = 1) {
  return useQuery({
    queryKey: ['podcasts', 'show', showSlug, page],
    queryFn: () => getPodcastEpisodesByShowSlug(showSlug as string, page),
    enabled: Boolean(showSlug),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

/** Every published show - used to populate the "Podcast" nav dropdown. A
 * real listing endpoint now (Modules/Podcast's index()), not a derived
 * scan of recent episodes. */
export function usePodcastShowList() {
  return useQuery({
    queryKey: ['podcasts', 'show-list'],
    queryFn: fetchPodcastShowList,
    staleTime: SHOW_LIST_STALE_TIME,
  });
}
