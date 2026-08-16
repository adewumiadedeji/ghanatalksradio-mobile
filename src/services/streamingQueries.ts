import { useQuery } from '@tanstack/react-query';
import { getBroadcastStatus } from './streamingApi';

// Short - "is a presenter on air" is exactly the kind of thing that
// changes while a listener is sitting on the Podcast tab (staff pressing
// Go live/End broadcast), unlike the show list (usePodcastShowList),
// which barely changes at all.
const STALE_TIME = 30 * 1000;

/** Backs the Podcast screen's LIVE NOW card - see getBroadcastStatus()'s
 * docblock for why this is a separate concept from radioStore's
 * nowPlaying.isLive (which only reflects this device's own playback
 * state, not whether anyone's actually presenting). */
export function useBroadcastStatus() {
  return useQuery({
    queryKey: ['streaming', 'broadcast-status'],
    queryFn: getBroadcastStatus,
    staleTime: STALE_TIME,
    // Polls while the Podcast screen is mounted so a staff Go live/End
    // broadcast toggle reflects here on its own - previously this only
    // ever refetched on screen focus, so a listener sitting on the tab
    // had to navigate away and back to see the change.
    refetchInterval: STALE_TIME,
  });
}
