import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * React Query only refetches automatically on a real component mount (or
 * an explicit invalidation) - it has no idea when a bottom-tab screen
 * regains focus, since tab screens stay mounted in the background rather
 * than unmounting/remounting. Without this, navigating away and back
 * shows stale cached data until the app is force-restarted.
 *
 * Call with one or more refetch functions (from useQuery/useInfiniteQuery)
 * and they'll re-run every time this screen comes back into focus.
 */
export function useRefetchOnFocus(...refetchFns: Array<() => unknown>) {
  useFocusEffect(
    useCallback(() => {
      refetchFns.forEach((refetch) => refetch());
      // Only re-run when the screen re-gains focus, not on every render -
      // the refetch functions themselves are stable enough across
      // re-renders for this to be safe to omit from deps.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );
}
