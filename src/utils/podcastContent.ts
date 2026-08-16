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

/**
 * Validates that a string is actually a usable audio URL before treating
 * it as a stream source. The backend (Modules/Podcast) already filters
 * this at import time (see ImportLegacyPodcasts), but this stays as a
 * client-side safety net for episodes entered by hand without the same
 * validation.
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
