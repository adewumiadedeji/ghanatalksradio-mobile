import { PodcastApiItem, PodcastEpisode, PodcastExternalLinks, PodcastShow, RawExternalLinksJson } from '../types/podcast';

const PODCAST_IMAGE_BASE_URL = 'https://api.ghanatalksradio.com/assets/images/';
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatEpisodeDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatEpisodeTimeRange(start?: string, end?: string): string {
  if (!start) return '';
  const s = new Date(start);
  if (isNaN(s.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  const startStr = s.toLocaleTimeString('en-US', opts);
  if (!end) return startStr;
  const e = new Date(end);
  if (isNaN(e.getTime())) return startStr;
  return `${startStr} – ${e.toLocaleTimeString('en-US', opts)}`;
}

const AUDIO_EXTENSIONS = ['.mp3', '.aac', '.m3u8', '.ogg', '.wav'];

/** Some episodes (confirmed: at least one, id 3638) carry a transcript URL
 * instead of audio in the raw `url` field - same edge case the original
 * flat podcast integration guarded against. */
function isLikelyAudioUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.includes(ext));
}

/**
 * Converts one raw item from the podcast/catchup API into our PodcastEpisode
 * shape. The exact raw field names weren't directly inspectable from this
 * environment (no network access to dev.ghanatalksradio.com), so this reads
 * several plausible field-name variants defensively - same approach used
 * elsewhere for this backend. If the real field names differ from what's
 * guessed here, this is the one function that needs adjusting.
 */




export function parseExternalLinks(raw: RawExternalLinksJson): PodcastExternalLinks {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Array<Record<string, string>>;
    if (!Array.isArray(parsed)) return {};

    const result: PodcastExternalLinks = {};
    for (const entry of parsed) {
      for (const [key, value] of Object.entries(entry)) {
        if (value && value.trim().length > 0) {
          (result as Record<string, string>)[key] = value;
        }
      }
    }
    return result;
  } catch {
    // Malformed JSON in this field has been observed in practice on this
    // backend — fail soft rather than throwing, since a broken external-links
    // block shouldn't take down the whole episode card.
    return {};
  }
}

/**
 * Validates that a string is actually a usable audio URL before treating
 * it as a stream source. Confirmed live data has at least one episode
 * (id 3638) where this field contains a full news bulletin transcript
 * instead of a URL — playing that as audio would silently fail or, worse,
 * attempt to "play" arbitrary text as a media source.
 *
 * Deliberately avoids the global `URL` object: React Native's built-in
 * polyfill (Libraries/Blob/URL.js) throws on `.protocol` access
 * ("not implemented"), which was silently caught here and made every
 * audioUrl resolve to null on-device even though the same check works
 * fine in a browser.
 */
export function isPlayableAudioUrl(value: string): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

/** Resolves a bare image filename from the podcast API into a full URL. Returns null if there's no filename to resolve. */
export function resolvePodcastImageUrl(filename: string): string | null {
  if (!filename) return null;
  // Guard against a future API response that already returns a full URL.
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  return `${PODCAST_IMAGE_BASE_URL}${filename}`;
}

/** Transforms one raw API item into the cleaned-up shape components consume. */
export function normalizePodcastItem2(item: PodcastApiItem): PodcastEpisode {
  const { data, details } = item;

  const show: PodcastShow = {
    id: details.id,
    name: details.name,
    imageUrl: resolvePodcastImageUrl(details.image),
    slug: details.slug,
    external: parseExternalLinks(details.external),
  };

  return {
    id: data.id,
    showId: data.show_id,
    startDate: data.start_date,
    endDate: data.end_date,
    audioUrl: isPlayableAudioUrl(data.url) ? data.url : null,
    description: data.description?.trim() ?? '',
    title: data.title?.trim() ?? 'Untitled episode',
    slug: data.slug,
    external: parseExternalLinks(data.external),
    show,
  };
}

