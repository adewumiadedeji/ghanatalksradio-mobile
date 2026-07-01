export interface Article {
  id: string;
  title: string;
  category: string;
  author: string;
  authorImage: string;
  readTime: string;
  excerpt: string;
  content: string;
  image: string;
  isBreaking: boolean;
  date: string;
  likes: number;
  views: number;
  link: string; // real WordPress permalink, used for sharing
}

export interface Raffle {
  id: string;
  title: string;
  subtitle: string;
  cost: number;
  totalEntered: number;
  timeRemainingSec: number;
  image: string;
  category: string;
  endingSoon: boolean;
  progress: number;
}

export interface UserEntry {
  raffleId: string;
  enteredAt: string;
  tickets: number;
}

export interface UserInfo {
  name: string;
  email: string;
  points: number;
  isPremium: boolean;
  registeredAt: string;
  bookmarkedArticleIds: string[];
  raffleEntries: UserEntry[];
}

export interface Poll {
  id: string;
  question: string;
  options: { text: string; votes: number }[];
  userVoteIndex?: number;
  rewardPoints: number;
}

// New: live stream state, not present in the web prototype since it had no radio screen
export type PlaybackState = 'stopped' | 'loading' | 'playing' | 'paused' | 'error';

// Podcast types live in types/podcast.ts (show-based: PodcastShow + PodcastEpisode),
// matching the web rebuild's architecture - not duplicated here.

// Video content sourced from WordPress posts with a YouTube embed in their
// body (see fetchVideoSourcePosts in services/api.ts) - distinct from
// PodcastEpisode, which comes from the separate audio catchup API.
export interface VideoPost {
  id: string;
  title: string;
  videoId: string;
  thumbnail: string;
  category: string;
  date: string;
}
