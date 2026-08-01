export type AdFeedItem<T> = { kind: 'item'; item: T } | { kind: 'ad'; key: string };

// Interleaves a native ad card into a list every `interval` items, for
// FlatLists that show article/episode cards mixed with in-feed ads.
export function withAds<T>(items: T[], interval: number): AdFeedItem<T>[] {
  const feed: AdFeedItem<T>[] = [];
  items.forEach((item, index) => {
    feed.push({ kind: 'item', item });
    if ((index + 1) % interval === 0) {
      feed.push({ kind: 'ad', key: `ad-${index}` });
    }
  });
  return feed;
}
