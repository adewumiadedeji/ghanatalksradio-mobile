import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  fetchPosts,
  fetchPostsByCategory,
  fetchPostsByIds,
  fetchCategories,
  searchPosts,
  fetchVideoSourcePosts,
  mapWPPostToArticle,
  mapWPPostToVideoPost,
} from './api';
import { Article, VideoPost } from '../types';

const PER_PAGE = 10;

export function useNewsFeed(categoryId?: number) {
  return useInfiniteQuery({
    queryKey: ['posts', categoryId ?? 'all'],
    queryFn: ({ pageParam = 1 }) =>
      categoryId
        ? fetchPostsByCategory(categoryId, pageParam, PER_PAGE)
        : fetchPosts(pageParam, PER_PAGE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes - news doesn't need to refetch on every screen focus
    select: (data) => ({
      ...data,
      articles: data.pages.flatMap((p) => p.posts.map(mapWPPostToArticle)),
    }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 30, // categories rarely change
  });
}

export function useSearchArticles(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async (): Promise<Article[]> => {
      const posts = await searchPosts(query);
      return posts.map(mapWPPostToArticle);
    },
    enabled: query.trim().length > 1,
    staleTime: 1000 * 60,
  });
}

// Podcast hooks now live in services/podcastQueries.ts (show-based, matching
// the web rebuild) - not duplicated here.

export function useBookmarkedArticles(articleIds: string[]) {
  const numericIds = articleIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id));
  return useQuery({
    queryKey: ['bookmarks', numericIds.sort().join(',')],
    queryFn: async (): Promise<Article[]> => {
      const posts = await fetchPostsByIds(numericIds);
      return posts.map(mapWPPostToArticle);
    },
    enabled: numericIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

// "Watch" section - video posts sourced from the music-video-mix/music/entertainment
// categories, filtered to those that actually contain a YouTube embed.
export function useVideoPosts() {
  return useQuery({
    queryKey: ['videoPosts'],
    queryFn: async (): Promise<VideoPost[]> => {
      const posts = await fetchVideoSourcePosts(20);
      return posts
        .map(mapWPPostToVideoPost)
        .filter((v): v is VideoPost => v !== null);
    },
    staleTime: 1000 * 60 * 10,
  });
}
