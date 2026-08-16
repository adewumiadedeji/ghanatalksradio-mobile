export interface Article {
  id: string;
  title: string;
  category: string;
  author: string;
  authorImage: string;
  readTime: string;
  excerpt: string;
  content: string; // raw WordPress HTML (post.content.rendered) - render with RenderHtml, not <Text>
  image: string;
  isBreaking: boolean;
  date: string;
  likes: number;
  views: number;
  link: string; // real WordPress permalink, used for sharing
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  token: string;
  points: number;
  registeredAt: string;
  bookmarkedArticleIds: string[];
}

// New: live stream state, not present in the web prototype since it had no radio screen
export type PlaybackState = 'stopped' | 'loading' | 'playing' | 'paused' | 'error';

// Podcast types live in types/podcast.ts (show-based: PodcastShow + PodcastEpisode),
// matching the web rebuild's architecture - not duplicated here.

// Poll types now live in services/pollsApi.ts (PollDto/PollOptionDto) -
// polls are backend-driven now, not mocked. Video content ("Watch" section)
// now comes from services/youtubeApi.ts (YoutubeVideoDto).
