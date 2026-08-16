import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

/**
 * Best-effort listener location for the admin Live Listeners map/columns
 * (see PublicListenController's docblock on the Laravel side: the server
 * deliberately does no IP-based geocoding of its own, so country/region
 * only ever show up if a client sends them). Every step here fails soft -
 * a denied permission, a GPS timeout, or a failed reverse-geocode all just
 * resolve to null fields rather than throwing, since this is analytics
 * bookkeeping, never something a listener should be blocked or nagged by.
 *
 * Reverse geocoding uses OpenStreetMap's free Nominatim API (no billing/
 * API key, unlike Google Geocoding) - acceptable here since this fires at
 * most once per listen session, well within Nominatim's usage policy
 * (nominatim.org/release-docs/latest/api/Reverse), not on any kind of
 * poll/interval.
 */
export interface ListenerLocation {
  latitude: number;
  longitude: number;
  country: string | null;
  region: string | null;
  city: string | null;
}

const GPS_TIMEOUT_MS = 8000;
// Cached position within this window is reused rather than re-requesting a
// GPS fix on every single play press - this is a coarse, once-in-a-while
// signal for a map pin, not something that needs to be fresh-to-the-second.
const GPS_MAX_AGE_MS = 10 * 60 * 1000;
const REVERSE_GEOCODE_TIMEOUT_MS = 5000;
const NOMINATIM_USER_AGENT = 'GhanaTalksRadioApp/1.0 (https://ghanatalksradio.com)';

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: 'Location access',
          message: 'GhanaTalksRadio uses your approximate location to show which region is tuning in on our live listeners map.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  // iOS: getCurrentPosition triggers the system prompt itself (backed by
  // Info.plist's NSLocationWhenInUseUsageDescription) if not yet
  // determined - requestAuthorization just surfaces it a beat earlier.
  return new Promise((resolve) => {
    Geolocation.requestAuthorization(() => resolve(true), () => resolve(false));
  });
}

function getCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: GPS_TIMEOUT_MS, maximumAge: GPS_MAX_AGE_MS }
    );
  });
}

async function reverseGeocode(latitude: number, longitude: number): Promise<{ country: string | null; region: string | null; city: string | null }> {
  const empty = { country: null, region: null, city: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVERSE_GEOCODE_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      { headers: { 'User-Agent': NOMINATIM_USER_AGENT, Accept: 'application/json' }, signal: controller.signal }
    );
    if (!response.ok) return empty;
    const json = await response.json();
    const address = json?.address ?? {};
    return {
      country: address.country ?? null,
      region: address.state ?? address.region ?? null,
      city: address.city ?? address.town ?? address.county ?? null,
    };
  } catch {
    return empty;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveListenerLocation(): Promise<ListenerLocation | null> {
  try {
    const permitted = await ensurePermission();
    if (!permitted) return null;

    const coords = await getCoordinates();
    if (!coords) return null;

    const place = await reverseGeocode(coords.latitude, coords.longitude);

    return { ...coords, ...place };
  } catch {
    return null;
  }
}
