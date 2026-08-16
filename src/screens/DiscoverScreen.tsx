import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { useSearchArticles } from '../services/queries';
import { usePollList, useVoteMutation } from '../services/pollsQueries';
import { PollDto, PollOptionDto } from '../services/pollsApi';
import { useYoutubeVideos } from '../services/youtubeQueries';
import { YoutubeVideoDto } from '../services/youtubeApi';
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus';
import { BannerAdSlot } from '../components/ads/BannerAdSlot';

const FACEBOOK_URL = 'https://www.facebook.com/GhanaTalksRadio/';
const INSTAGRAM_URL = 'https://www.instagram.com/ghanatalksradio/';

export default function DiscoverScreen({ navigation }: any) {
  const user = useUserStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: results, isLoading, isError } = useSearchArticles(searchQuery);

  const { data: polls, isLoading: pollsLoading, refetch: refetchPolls } = usePollList(user?.token ?? null);
  const voteMutation = useVoteMutation();

  const {
    data: videoPages,
    isLoading: videosLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchVideos,
  } = useYoutubeVideos();

  // Discover sits in a bottom-tab navigator, so it stays mounted in the
  // background when the user switches tabs - without this, polls/videos
  // only ever refresh on the very first mount, not on returning to the tab.
  useRefetchOnFocus(refetchPolls, refetchVideos);

  const liveVideos = videoPages?.pages[0]?.live ?? [];
  const liveIds = new Set(liveVideos.map((v) => v.videoId));
  const recentVideos = (videoPages?.pages.flatMap((p) => p.videos) ?? []).filter(
    (v) => !liveIds.has(v.videoId)
  );
  const allVideos: (YoutubeVideoDto & { isLive: boolean })[] = [
    ...liveVideos.map((v) => ({ ...v, isLive: true })),
    ...recentVideos.map((v) => ({ ...v, isLive: false })),
  ];

  const isSearching = searchQuery.trim().length > 1;

  const openVideo = (video: YoutubeVideoDto) => {
    navigation.navigate('YoutubeVideo', { videoId: video.videoId, title: video.title });
  };

  const handleVote = (pollId: string, optionId: number) => {
    if (!user) {
      Alert.alert('Sign in to vote', 'Create a free account or sign in to vote on this poll.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('AuthModal', { screen: 'Login' }) },
      ]);
      return;
    }
    voteMutation.mutate(
      { token: user.token, pollId, optionId },
      {
        onError: (e) => {
          Alert.alert('Could not record your vote', e instanceof Error ? e.message : 'Please try again.');
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Discover</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search news, topics..."
            placeholderTextColor={COLORS.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={isSearching ? results ?? [] : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isSearching ? (
            isLoading ? (
              <ActivityIndicator color={COLORS.secondary} style={{ marginTop: SPACING.xl }} />
            ) : isError ? (
              <Text style={styles.emptyText}>Couldn't search right now. Try again shortly.</Text>
            ) : (
              <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
            )
          ) : (
            <View style={{ gap: SPACING.lg }}>
              {/* --- Polls --- */}
              <View style={{ gap: SPACING.md }}>
                <Text style={styles.sectionTitle}>Polls</Text>
                {pollsLoading ? (
                  <ActivityIndicator color={COLORS.secondary} />
                ) : !polls || polls.length === 0 ? (
                  <Text style={styles.emptyText}>No polls right now — check back soon.</Text>
                ) : (
                  polls.map((poll: PollDto) => {
                    // Results are hidden (not "zero votes") when every
                    // option's `votes` is null - see pollsApi.ts's
                    // docblock. Only show the fill bar/percentages once
                    // there's a real count to show, even if this device
                    // has already voted.
                    const resultsHidden = poll.options.every((o) => o.votes === null);
                    const totalVotes = poll.options.reduce((sum: number, o: PollOptionDto) => sum + (o.votes ?? 0), 0);
                    const voted = poll.your_option_id !== null;
                    const showResults = voted && !resultsHidden;
                    return (
                      <View key={poll.id} style={styles.pollCard}>
                        <Text style={styles.pollQuestion}>{poll.question}</Text>
                        {poll.sponsor && (
                          <Text style={styles.pollSponsor}>Sponsored by {poll.sponsor.name}</Text>
                        )}
                        {poll.options.map((option: PollOptionDto) => {
                          const pct = totalVotes ? Math.round(((option.votes ?? 0) / totalVotes) * 100) : 0;
                          return (
                            <Pressable
                              key={option.id}
                              style={styles.pollOption}
                              onPress={() => handleVote(poll.id, option.id)}
                              disabled={voted}
                            >
                              {showResults && <View style={[styles.pollFill, { width: `${pct}%` }]} />}
                              <Text style={styles.pollOptionText}>{option.text}</Text>
                              {showResults && <Text style={styles.pollPct}>{pct}%</Text>}
                            </Pressable>
                          );
                        })}
                        {voted && resultsHidden && (
                          <Text style={styles.pollReward}>Vote recorded - results are hidden until this poll closes.</Text>
                        )}
                        {!voted && poll.reward_points > 0 && (
                          <Text style={styles.pollReward}>Vote to earn +{poll.reward_points} points</Text>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              <BannerAdSlot />

              {/* --- YouTube --- */}
              <View style={{ gap: SPACING.sm }}>
                <Text style={styles.sectionTitle}>YouTube</Text>
                {videosLoading ? (
                  <ActivityIndicator color={COLORS.secondary} />
                ) : allVideos.length === 0 ? (
                  <Text style={styles.emptyText}>No videos available right now.</Text>
                ) : (
                  <FlatList
                    horizontal
                    data={allVideos}
                    keyExtractor={(item) => item.videoId}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.videoRow}
                    onEndReached={() => {
                      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                      isFetchingNextPage ? (
                        <ActivityIndicator color={COLORS.secondary} style={{ marginHorizontal: SPACING.md }} />
                      ) : null
                    }
                    renderItem={({ item }) => (
                      <Pressable style={styles.videoCard} onPress={() => openVideo(item)}>
                        <View>
                          <Image source={{ uri: item.thumbnail }} style={styles.videoThumb} />
                          {item.isLive && (
                            <View style={styles.liveBadge}>
                              <Text style={styles.liveBadgeText}>LIVE</Text>
                            </View>
                          )}
                          <View style={styles.playOverlay}>
                            <Ionicons name="play-circle" size={36} color="#fff" />
                          </View>
                        </View>
                        <Text style={styles.videoTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </Pressable>
                    )}
                  />
                )}
              </View>

              {/* --- Facebook --- */}
              <SocialSection
                icon="logo-facebook"
                title="Facebook"
                message="Follow us on Facebook for more updates."
                actionLabel="Follow us on Facebook"
                onPress={() =>
                  Linking.openURL(FACEBOOK_URL).catch(() =>
                    Alert.alert('Could not open link', 'Please check your internet connection and try again.')
                  )
                }
              />

              {/* --- TikTok --- */}
              <SocialSection
                icon="logo-tiktok"
                title="TikTok"
                message="Our TikTok content is coming soon."
              />

              {/* --- Instagram --- */}
              <SocialSection
                icon="logo-instagram"
                title="Instagram"
                message="Follow us on Instagram for more updates."
                actionLabel="Follow us on Instagram"
                onPress={() =>
                  Linking.openURL(INSTAGRAM_URL).catch(() =>
                    Alert.alert('Could not open link', 'Please check your internet connection and try again.')
                  )
                }
              />
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.resultCard}>
            <Text style={styles.resultCategory}>{item.category.toUpperCase()}</Text>
            <Text style={styles.resultTitle}>{item.title}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function SocialSection({
  icon,
  title,
  message,
  actionLabel,
  onPress,
}: {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.socialCard}>
        <Ionicons name={icon as any} size={28} color={COLORS.secondary} />
        <Text style={styles.socialMessage}>{message}</Text>
        {actionLabel && onPress && (
          <Pressable style={styles.socialButton} onPress={onPress}>
            <Text style={styles.socialButtonText}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  header: { padding: SPACING.md, gap: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.onSurface },
  listContent: { padding: SPACING.md, gap: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  pollCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 10,
  },
  pollQuestion: { fontSize: 16, fontWeight: '600', color: COLORS.onSurface },
  pollSponsor: { fontSize: 12, color: COLORS.onSurfaceVariant, fontStyle: 'italic' },
  pollOption: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.sm,
    padding: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pollFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  pollOptionText: { fontSize: 14, color: COLORS.onSurface, fontWeight: '500' },
  pollPct: { fontSize: 13, color: COLORS.onSurfaceVariant, fontWeight: '600' },
  pollReward: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  videoRow: { gap: SPACING.sm },
  videoCard: { width: 160 },
  videoThumb: { width: 160, height: 96, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceContainer },
  liveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.error,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: { fontSize: 12, fontWeight: '600', color: COLORS.onSurface, marginTop: 6 },
  socialCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 8,
  },
  socialMessage: { fontSize: 13, color: COLORS.onSurfaceVariant, textAlign: 'center' },
  socialButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    marginTop: 4,
  },
  socialButtonText: { color: COLORS.onSecondary, fontWeight: '700', fontSize: 13 },
  resultCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  resultCategory: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, marginBottom: 4 },
  resultTitle: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface },
  emptyText: { textAlign: 'center', color: COLORS.onSurfaceVariant, marginTop: SPACING.md },
});
