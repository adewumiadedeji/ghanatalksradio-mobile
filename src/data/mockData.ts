import { Article, Raffle, Poll } from '../types';

// Rebranded from the Stitch prototype's "Global Pulse" placeholder content.
// Swap this out for src/services/api.ts -> fetchPosts() once you're ready
// to wire the News screen to the real WordPress backend.
export const MOCK_ARTICLES: Article[] = [
  {
    id: 'breaking-budget',
    title: 'Finance Ministry Unveils 2026 Mid-Year Budget Review',
    category: 'News',
    author: 'GhanaTalksRadio Newsroom',
    authorImage: 'https://i.pravatar.cc/150?img=12',
    readTime: '6 min read',
    excerpt:
      'The Finance Minister presented the mid-year budget review to Parliament, outlining revised revenue targets and infrastructure spending priorities.',
    content:
      'The Finance Minister presented the mid-year budget review to Parliament on Tuesday, outlining revised revenue targets and infrastructure spending priorities for the second half of the year.\n\nKey announcements included continued investment in road infrastructure, an update on the digitisation agenda, and revised projections for GDP growth. Analysts say the review reflects a cautious but steady approach to managing the national purse amid global economic headwinds.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop&q=80',
    isBreaking: true,
    date: 'June 30, 2026',
    likes: 312,
    views: 4892,
    link: 'https://ghanatalksradio.com/',
  },
  {
    id: 'afcon-prep',
    title: 'Black Stars Camp Opens Ahead of Qualifier Double-Header',
    category: 'Sports',
    author: 'Kwame Owusu',
    authorImage: 'https://i.pravatar.cc/150?img=33',
    readTime: '4 min read',
    excerpt:
      'The national team begins camp in Accra this week as preparations intensify for the upcoming World Cup qualifier matches.',
    content:
      'The Black Stars opened camp in Accra this week as preparations intensify for the upcoming World Cup qualifier double-header. The technical team has called up several home-based players alongside the usual core of European-based stars.\n\nFans can catch live match commentary and post-match analysis right here on GhanaTalksRadio.',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&auto=format&fit=crop&q=80',
    isBreaking: false,
    date: 'June 29, 2026',
    likes: 980,
    views: 3105,
    link: 'https://ghanatalksradio.com/',
  },
  {
    id: 'tech-hub-accra',
    title: 'Accra Tech Hub Reports Record Startup Funding in Q2',
    category: 'Technology',
    author: 'Ama Serwaa',
    authorImage: 'https://i.pravatar.cc/150?img=45',
    readTime: '5 min read',
    excerpt:
      'Local startups raised more in the second quarter than any prior quarter on record, led by fintech and agritech ventures.',
    content:
      'Local startups raised more in the second quarter than any prior quarter on record, led by fintech and agritech ventures based in and around Accra.\n\nIndustry watchers attribute the surge to growing investor confidence in West African digital infrastructure and a wave of returning diaspora talent.',
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop&q=80',
    isBreaking: false,
    date: 'June 28, 2026',
    likes: 540,
    views: 2210,
    link: 'https://ghanatalksradio.com/',
  },
  {
    id: 'rain-advisory',
    title: 'Meteo Agency Issues Heavy Rain Advisory for Coastal Regions',
    category: 'News',
    author: 'GhanaTalksRadio Newsroom',
    authorImage: 'https://i.pravatar.cc/150?img=12',
    readTime: '3 min read',
    excerpt:
      'Residents in coastal areas are advised to take precautions as heavy rainfall is expected over the coming days.',
    content:
      'The Ghana Meteorological Agency has issued an advisory for heavy rainfall expected across coastal regions over the coming days. Residents are advised to clear drains and avoid flood-prone areas.',
    image: 'https://images.unsplash.com/photo-1428592953211-077101b2021b?w=800&auto=format&fit=crop&q=80',
    isBreaking: false,
    date: 'June 27, 2026',
    likes: 210,
    views: 1530,
    link: 'https://ghanatalksradio.com/',
  },
];

export const MOCK_RAFFLES: Raffle[] = [
  {
    id: 'raffle-smartphone',
    title: 'Win a Brand New Smartphone',
    subtitle: 'Listener Appreciation Giveaway',
    cost: 200,
    totalEntered: 1840,
    timeRemainingSec: 9912,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    category: 'Electronics',
    endingSoon: true,
    progress: 0.72,
  },
  {
    id: 'raffle-giftpack',
    title: '₵500 Shopping Voucher',
    subtitle: 'Mid-Year Mega Raffle',
    cost: 100,
    totalEntered: 920,
    timeRemainingSec: 86400,
    image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&auto=format&fit=crop&q=80',
    category: 'Shopping',
    endingSoon: false,
    progress: 0.35,
  },
];

export const MOCK_POLLS: Poll[] = [
  {
    id: 'poll-budget',
    question: 'Do you think the mid-year budget review addresses key economic concerns?',
    options: [
      { text: 'Yes, it covers the essentials', votes: 412 },
      { text: 'No, more is needed', votes: 588 },
    ],
    rewardPoints: 25,
  },
];

export const RECENT_WINNERS = [
  '@KwameA won a Brand New Smartphone',
  '@AbenaPulse won a ₵500 Shopping Voucher',
  '@YawMike01 won Studio Headphones',
  '@TravelBug won a Weekend Getaway',
  '@NewsJunkie won 1,000 Bonus Points',
];
