import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchYoutubeVideos } from './youtubeApi';

export function useYoutubeVideos() {
  return useInfiniteQuery({
    queryKey: ['youtube', 'videos'],
    queryFn: ({ pageParam }: { pageParam?: string }) => fetchYoutubeVideos(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    staleTime: 1000 * 60 * 5, // 5 min - live status can change, but not worth polling harder than this
  });
}
