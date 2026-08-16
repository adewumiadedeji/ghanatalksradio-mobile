/**
 * Types for the Podcast API - ghanatalksradio-portal's Modules/Podcast
 * (see PublicPodcastController), replacing the legacy CodeIgniter
 * podcast/catchup API. Much cleaner shape than the legacy one: real
 * nested JSON (not JSON-encoded strings), fully-resolved image URLs (not
 * bare filenames needing a client-side base path), and real per-show/
 * per-episode/all-episodes endpoints instead of one flat paginated feed
 * clients had to scan and filter themselves.
 */

export interface PodcastExternalLinks {
  spotify?: string;
  apple?: string;
  youtube?: string;
  amazon?: string;
  google?: string;
}

/** Raw shape of one item in GET /api/podcasts ("series" array). */
export interface PodcastSeriesRaw {
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  external_links: PodcastExternalLinks;
  presenter: string | null;
  episode_count: number;
}

/** Raw shape of one episode, as returned by the show/episode/episodes-feed endpoints. */
export interface PodcastEpisodeRaw {
  title: string;
  slug: string;
  episode_number: number | null;
  description: string | null;
  /** Occasionally missing/garbage on imported legacy data - validate with isPlayableAudioUrl() before use. */
  audio_url: string | null;
  external_links: PodcastExternalLinks;
  duration_seconds: number | null;
  published_at: string | null;
}

/**
 * A cleaned-up episode for use in the app - ready for components to
 * consume directly. `endDate` has no real backend equivalent anymore
 * (the legacy schema tracked a start/end broadcast time; this one just
 * has a single publish timestamp) - always an empty string, which
 * formatEpisodeTimeRange() already treats as "no end time known".
 */
export interface PodcastEpisode {
  id: string;
  showId: string;
  startDate: string;
  endDate: string;
  /** null if audio_url was missing or didn't pass isPlayableAudioUrl(). */
  audioUrl: string | null;
  description: string;
  title: string;
  slug: string;
  external: PodcastExternalLinks;
  show: PodcastShow;
}

export interface PodcastShow {
  id: string;
  name: string;
  imageUrl: string | null;
  slug: string;
  external: PodcastExternalLinks;
}
