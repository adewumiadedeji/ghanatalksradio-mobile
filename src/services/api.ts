import { Article } from '../types';

const WP_API_BASE = 'https://wordpress.ghanatalksradio.com/wp-json/wp/v2';
export const LIVE_STREAM_URL = 'https://live.ghanatalksradio.com/listen';

// --- WordPress News (REST API) ---
// Confirmed in the web-rebuild session: only standard post types exist
// (post/page/attachment), no ACF, no custom post types. Tagdiv Newspaper
// theme generates td_* image sizes inside _embedded media.

export interface WPPost {
  id: number;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  link: string;
  categories: number[];
  sticky?: boolean;
  _embedded?: {
    'wp:featuredmedia'?: { source_url: string; alt_text?: string }[];
    author?: { name: string; avatar_urls?: Record<string, string> }[];
    'wp:term'?: { name: string; taxonomy: string }[][];
  };
}

export interface PostsPage {
  posts: WPPost[];
  totalPages: number;
  page: number;
}

export async function fetchPosts(page = 1, perPage = 10): Promise<PostsPage> {
  const res = await fetch(
    `${WP_API_BASE}/posts?page=${page}&per_page=${perPage}&_embed=true`
  );
  if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
  const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '1');
  const posts: WPPost[] = await res.json();
  return { posts, totalPages, page };
}

export async function fetchPostsByCategory(
  categoryIds: number | number[],
  page = 1,
  perPage = 10
): Promise<PostsPage> {
  const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
  const res = await fetch(
    `${WP_API_BASE}/posts?categories=${ids.join(',')}&page=${page}&per_page=${perPage}&_embed=true`
  );
  if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
  const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '1');
  const posts: WPPost[] = await res.json();
  return { posts, totalPages, page };
}

export async function searchPosts(query: string): Promise<WPPost[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${WP_API_BASE}/posts?search=${encodeURIComponent(query)}&_embed=true&per_page=20`
  );
  if (!res.ok) throw new Error(`Failed to search posts: ${res.status}`);
  return res.json();
}

export async function fetchPostsByIds(ids: number[]): Promise<WPPost[]> {
  if (!ids.length) return [];
  const res = await fetch(
    `${WP_API_BASE}/posts?include=${ids.join(',')}&_embed=true&per_page=${ids.length}`
  );
  if (!res.ok) throw new Error(`Failed to fetch posts by id: ${res.status}`);
  return res.json();
}

export interface WPCategory {
  id: number;
  name: string;
  count: number;
}

export async function fetchCategories(): Promise<WPCategory[]> {
  const res = await fetch(`${WP_API_BASE}/categories?per_page=50&orderby=count&order=desc`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json();
}

export async function fetchCategoryBySlug(slug: string): Promise<WPCategory | null> {
  const res = await fetch(`${WP_API_BASE}/categories?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`Failed to fetch category "${slug}": ${res.status}`);
  const results: WPCategory[] = await res.json();
  return results[0] ?? null;
}

// --- Mapping WPPost -> our app's Article shape ---
// WordPress returns HTML-rendered fields and no app-specific concepts like
// "readTime", "isBreaking" etc, so we derive those here, in one place,
// mirroring the logic the web rebuild used in its post-normalization layer.

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80';

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&#039;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8230;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateReadTime(plainText: string): string {
  const words = plainText.split(' ').filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function formatPostDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function mapWPPostToArticle(post: WPPost): Article {
  const plainContent = stripHtml(post.content.rendered);
  const plainExcerpt = stripHtml(post.excerpt.rendered);
  const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
  const author = post._embedded?.author?.[0];
  const categoryTerm = post._embedded?.['wp:term']
    ?.flat()
    .find((term) => term.taxonomy === 'category');

  return {
    id: String(post.id),
    title: stripHtml(post.title.rendered),
    category: categoryTerm?.name ?? 'News',
    author: author?.name ?? 'GhanaTalksRadio Newsroom',
    authorImage: author?.avatar_urls?.['96'] ?? 'https://i.pravatar.cc/150?img=12',
    readTime: estimateReadTime(plainContent),
    excerpt: plainExcerpt,
    // Raw HTML, not stripped - the detail screen renders this with RenderHtml
    // so embedded YouTube iframes and formatting survive; stripHtml() above
    // is still used for the plain-text title/excerpt/read-time estimate.
    content: post.content.rendered,
    image: featuredMedia?.source_url ?? FALLBACK_IMAGE,
    isBreaking: !!post.sticky,
    date: formatPostDate(post.date),
    likes: 0,
    views: 0,
    link: post.link,
  };
}

// Video content ("Watch" section on Discover) now comes from the station's
// YouTube channel directly via services/youtubeApi.ts, not from WordPress
// posts - see DiscoverScreen.tsx.

// Podcast/catchup fetching now lives in services/podcastApi.ts (show-based
// architecture matching the web rebuild) - not duplicated here.
