export interface PlatformLink {
  key: string;
  label: string;
  icon: string; // Ionicons name, or a generic fallback where no brand icon exists
  accent: string;
  url: string;
}

// Ionicons covers most of these as 'logo-*' brand icons; Spotify has no
// Ionicons brand glyph as of this writing, so it falls back to a generic
// music icon rather than going without one entirely.
const PLATFORM_META: Record<string, { label: string; icon: string; accent: string }> = {
  spotify: { label: 'Spotify', icon: 'musical-notes', accent: '#1DB954' },
  youtube: { label: 'YouTube', icon: 'logo-youtube', accent: '#FF0000' },
  apple: { label: 'Apple Podcasts', icon: 'logo-apple', accent: '#A855F7' },
  amazon: { label: 'Amazon Music', icon: 'logo-amazon', accent: '#FF9900' },
  google: { label: 'Google Podcasts', icon: 'logo-google', accent: '#4285F4' },
};

/**
 * Resolves a show's `external` link map into renderable platform links,
 * filtering out empty/missing entries. Order follows PLATFORM_META's
 * declaration order, same as the web version's fixed platform ordering.
 */
export function getAvailablePlatformLinks(external?: Record<string, string>): PlatformLink[] {
  if (!external) return [];
  return Object.entries(PLATFORM_META)
    .filter(([key]) => !!external[key])
    .map(([key, meta]) => ({
      key,
      label: meta.label,
      icon: meta.icon,
      accent: meta.accent,
      url: external[key],
    }));
}
