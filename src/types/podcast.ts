/**
 * Types for the Podcast API at dev.ghanatalksradio.com/index.php/api/podcast.
 *
 * This is a completely separate backend from the WordPress REST API — a
 * conventional PHP (CodeIgniter-style) app, not a JSON-first API, so the
 * response shape has some real rough edges worth designing around rather
 * than assuming away:
 *
 * - Every field comes back as a string, including numeric IDs — this is
 *   typical of PHP backends that don't cast DB columns before encoding JSON.
 * - `external` (on both the episode and the show) is a JSON-encoded STRING,
 *   not real nested JSON — e.g. "[{\"spotify\":\"...\"},{\"youtube\":\"...\"}]".
 *   It must be parsed client-side with parseExternalLinks() before use.
 * - `data.url` (the episode audio URL) is occasionally garbage — at least
 *   one confirmed live episode (id 3638) had the full news script dumped
 *   into this field instead of an audio URL. Always validate with
 *   isPlayableAudioUrl() before treating it as a stream source.
 * - `data.image` is empty on every confirmed sample; the real artwork is
 *   on `details.image`, and it's a bare filename (e.g.
 *   "202503030459_kKpbt97YsvBML8oTDqUX.jpg"), not a full URL — resolve
 *   with resolvePodcastImageUrl().
 * - Pagination is a path segment, not a query param:
 *   /index.php/api/podcast/{page}/ — confirmed page 1 and page 2 return
 *   genuinely different episodes, 10 per page.
 */

/** A single external listening-platform link, before parsing. */
export type RawExternalLinksJson = string;

export interface PodcastExternalLinks {
  spotify?: string;
  apple?: string;
  youtube?: string;
  amazon?: string;
  google?: string;
}

/** The episode itself ("data" in the raw API response). */
export interface PodcastEpisodeRaw {
  id: string;
  show_id: string;
  start_date: string;
  end_date: string;
  /** Usually a direct Firebase-hosted MP3 URL. Occasionally garbage text — validate before use. */
  url: string;
  description: string;
  catchup_id: string;
  title: string;
  slug: string;
  /** Confirmed always empty in practice; use details.image (the show's artwork) instead. */
  image: string;
  external: RawExternalLinksJson;
}

/** The show this episode belongs to ("details" in the raw API response). */
export interface PodcastShowRaw {
  id: string;
  name: string;
  /** Bare filename, not a full URL — resolve with resolvePodcastImageUrl(). */
  image: string;
  catchup_id: string;
  slug: string;
  external: RawExternalLinksJson;
}

/** One item in the API's top-level data array. */
export interface PodcastApiItem {
  data: PodcastEpisodeRaw;
  details: PodcastShowRaw;
  /** Present on every item, always false in confirmed samples — purpose unclear, don't rely on it. */
  status: boolean;
}

export interface PodcastApiResponse {
  status: boolean;
  message: string;
  data: PodcastApiItem[];
}

/**
 * A cleaned-up episode for use in the app — parsed external links, no
 * string/number ambiguity, ready for components to consume directly.
 */
export interface PodcastEpisode {
  id: string;
  showId: string;
  startDate: string;
  endDate: string;
  /** null if the raw url field didn't pass isPlayableAudioUrl(). */
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
