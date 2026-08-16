import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { PrimaryButton } from '../../components/UI';
import { useUserStore } from '../../store/userStore';
import { getGuestToken } from '../../utils/guestToken';
import {
  fetchPredictionList,
  fetchPredictionDetail,
  predictFixture,
  fetchComments,
  postComment,
  PredictionSummaryDto,
  PredictionDetailDto,
  FixtureDto,
  CommentDto,
} from '../../services/predictionApi';

const PREDICTIONS_PAGE_SIZE = 10;
const FIXTURES_PAGE_SIZE = 6;

interface CommentsState {
  items: CommentDto[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

export default function PredictionsScreen({ navigation }: any) {
  const user = useUserStore((s) => s.user);
  const [predictions, setPredictions] = useState<PredictionSummaryDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [visiblePredictionsCount, setVisiblePredictionsCount] = useState(PREDICTIONS_PAGE_SIZE);

  const [active, setActive] = useState<PredictionDetailDto | null>(null);
  const [visibleFixturesCount, setVisibleFixturesCount] = useState(FIXTURES_PAGE_SIZE);
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({});
  const [submittingFixtureId, setSubmittingFixtureId] = useState<number | null>(null);

  const [commentsFixture, setCommentsFixture] = useState<FixtureDto | null>(null);
  const [commentsByFixture, setCommentsByFixture] = useState<Record<number, CommentsState>>({});
  const [commentDraft, setCommentDraft] = useState('');
  const [guestName, setGuestName] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    fetchPredictionList()
      .then(setPredictions)
      .catch(() => setPredictions([]))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = async (slug: string) => {
    try {
      const guestToken = user ? undefined : await getGuestToken();
      const detail = await fetchPredictionDetail(slug, user?.token, guestToken);
      setActive(detail);
      setScores({});
      setVisibleFixturesCount(FIXTURES_PAGE_SIZE);
      setCommentsByFixture({});
    } catch (e) {
      Alert.alert("Couldn't open prediction game", e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const backToList = () => {
    setActive(null);
    setCommentsFixture(null);
    setCommentsByFixture({});
  };

  const myPredictionFor = (fixtureId: number) =>
    active?.my_predictions.find((p) => p.fixture_id === fixtureId) ?? null;

  // Open/predictable fixtures first (soonest kickoff), completed ones after
  // (most recently played first) - a listener opening the game cares about
  // what they can still act on, not last week's already-graded results.
  const sortedFixtures = useMemo(() => {
    if (!active) return [];
    const open = active.fixtures.filter((f) => f.predictions_open);
    const closed = active.fixtures.filter((f) => !f.predictions_open);
    open.sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
    closed.sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());
    return [...open, ...closed];
  }, [active]);

  const visibleFixtures = sortedFixtures.slice(0, visibleFixturesCount);
  const hasMoreFixtures = visibleFixturesCount < sortedFixtures.length;

  const visiblePredictions = (predictions ?? []).slice(0, visiblePredictionsCount);
  const hasMorePredictions = visiblePredictionsCount < (predictions?.length ?? 0);

  const handlePredict = async (fixture: FixtureDto) => {
    if (!active) return;
    const entry = scores[fixture.id];
    const home = parseInt(entry?.home ?? '', 10);
    const away = parseInt(entry?.away ?? '', 10);
    if (Number.isNaN(home) || Number.isNaN(away) || home < 0 || away < 0) {
      Alert.alert('Enter a score', 'Enter a predicted score for both teams (0 or higher).');
      return;
    }
    setSubmittingFixtureId(fixture.id);
    try {
      const guestToken = user ? undefined : await getGuestToken();
      await predictFixture(active.slug, fixture.id, home, away, user?.token, guestToken);
      await loadDetail(active.slug);
    } catch (e) {
      Alert.alert("Couldn't submit prediction", e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmittingFixtureId(null);
    }
  };

  const openComments = (fixture: FixtureDto) => {
    setCommentsFixture(fixture);
    setCommentDraft('');
    if (commentsByFixture[fixture.id] || !active) return;

    setCommentsByFixture((prev) => ({
      ...prev,
      [fixture.id]: { items: [], page: 0, hasMore: true, loading: true, loadingMore: false },
    }));
    fetchComments(active.slug, fixture.id, 1)
      .then((res) => {
        setCommentsByFixture((prev) => ({
          ...prev,
          [fixture.id]: { items: res.comments, page: res.page, hasMore: res.has_more, loading: false, loadingMore: false },
        }));
      })
      .catch(() => {
        setCommentsByFixture((prev) => ({
          ...prev,
          [fixture.id]: { items: [], page: 1, hasMore: false, loading: false, loadingMore: false },
        }));
      });
  };

  const closeComments = () => {
    setCommentsFixture(null);
    setCommentDraft('');
  };

  const loadMoreComments = () => {
    if (!active || !commentsFixture) return;
    const state = commentsByFixture[commentsFixture.id];
    if (!state || state.loading || state.loadingMore || !state.hasMore) return;

    setCommentsByFixture((prev) => ({ ...prev, [commentsFixture.id]: { ...state, loadingMore: true } }));
    fetchComments(active.slug, commentsFixture.id, state.page + 1)
      .then((res) => {
        setCommentsByFixture((prev) => {
          const cur = prev[commentsFixture.id];
          return {
            ...prev,
            [commentsFixture.id]: {
              items: [...cur.items, ...res.comments],
              page: res.page,
              hasMore: res.has_more,
              loading: false,
              loadingMore: false,
            },
          };
        });
      })
      .catch(() => {
        setCommentsByFixture((prev) => ({
          ...prev,
          [commentsFixture.id]: { ...prev[commentsFixture.id], loadingMore: false },
        }));
      });
  };

  const handlePostComment = async () => {
    if (!active || !commentsFixture) return;
    const body = commentDraft.trim();
    if (!body) return;
    if (!user && !guestName.trim()) {
      Alert.alert('Enter your name', 'Add a name so other listeners know who left the comment.');
      return;
    }
    setPostingComment(true);
    try {
      const guestToken = user ? undefined : await getGuestToken();
      const comment = await postComment(active.slug, commentsFixture.id, body, user?.token, guestToken, guestName.trim());
      setCommentsByFixture((prev) => {
        const cur = prev[commentsFixture.id] ?? { items: [], page: 1, hasMore: false, loading: false, loadingMore: false };
        return { ...prev, [commentsFixture.id]: { ...cur, items: [...cur.items, comment] } };
      });
      setCommentDraft('');
    } catch (e) {
      Alert.alert("Couldn't post comment", e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setPostingComment(false);
    }
  };

  const commentsState = commentsFixture ? commentsByFixture[commentsFixture.id] : undefined;

  const CommentsModal = (
    <Modal visible={!!commentsFixture} animationType="slide" transparent onRequestClose={closeComments}>
      <KeyboardAvoidingView
        style={styles.commentsBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.commentsSheet}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsHeaderTitle} numberOfLines={1}>
              {commentsFixture ? `${commentsFixture.home_team} vs ${commentsFixture.away_team}` : ''}
            </Text>
            <Pressable onPress={closeComments} hitSlop={8}>
              <Ionicons name="close" size={22} color={COLORS.onSurfaceVariant} />
            </Pressable>
          </View>

          <FlatList
            data={commentsState?.items ?? []}
            keyExtractor={(c) => String(c.id)}
            style={styles.commentsList}
            contentContainerStyle={styles.commentsListContent}
            onEndReachedThreshold={0.4}
            onEndReached={loadMoreComments}
            ListEmptyComponent={
              commentsState?.loading ? (
                <ActivityIndicator color={COLORS.secondary} style={{ marginTop: SPACING.lg }} />
              ) : (
                <Text style={styles.emptyText}>No comments yet - be the first.</Text>
              )
            }
            renderItem={({ item: c }) => (
              <View style={styles.commentRow}>
                <View style={styles.rowBetween}>
                  <Text style={styles.commentAuthor}>{c.author}</Text>
                  <Text style={styles.meta}>{new Date(c.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.commentBody}>{c.body}</Text>
              </View>
            )}
            ListFooterComponent={
              commentsState?.loadingMore ? (
                <ActivityIndicator color={COLORS.secondary} style={{ marginVertical: SPACING.md }} />
              ) : null
            }
          />

          <View style={styles.commentComposer}>
            {!user && (
              <TextInput
                style={styles.commentNameInput}
                placeholder="Your name"
                placeholderTextColor={COLORS.outline}
                value={guestName}
                onChangeText={setGuestName}
              />
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentBodyInput}
                placeholder="Add a comment"
                placeholderTextColor={COLORS.outline}
                value={commentDraft}
                onChangeText={setCommentDraft}
                multiline
              />
              <Pressable
                style={[styles.sendButton, (!commentDraft.trim() || postingComment) && styles.sendButtonDisabled]}
                onPress={handlePostComment}
                disabled={!commentDraft.trim() || postingComment}
              >
                {postingComment ? (
                  <ActivityIndicator color={COLORS.onPrimary} size="small" />
                ) : (
                  <Ionicons name="send" size={18} color={COLORS.onPrimary} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (active) {
    return (
      <SafeAreaView style={styles.flex}>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={visibleFixtures}
          keyExtractor={(f) => String(f.id)}
          ListHeaderComponent={
            <View style={{ gap: 4, marginBottom: SPACING.md }}>
              <Pressable onPress={backToList} style={styles.backRow}>
                <Ionicons name="chevron-back" size={18} color={COLORS.secondary} />
                <Text style={styles.backText}>All predictions</Text>
              </Pressable>
              <Text style={styles.screenTitle}>{active.name}</Text>
              {!!active.description && <Text style={styles.subtitle}>{active.description}</Text>}
            </View>
          }
          ListFooterComponent={
            hasMoreFixtures ? (
              <Pressable
                style={styles.showMoreButton}
                onPress={() => setVisibleFixturesCount((c) => c + FIXTURES_PAGE_SIZE)}
              >
                <Text style={styles.showMoreText}>Show more fixtures</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item: fixture }) => {
            const mine = myPredictionFor(fixture.id);
            const fixtureComments = commentsByFixture[fixture.id];
            return (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.title}>
                    {fixture.home_team} vs {fixture.away_team}
                  </Text>
                  {!fixture.predictions_open && <Text style={styles.closedBadge}>Closed</Text>}
                </View>
                <Text style={styles.meta}>{new Date(fixture.kickoff_at).toLocaleString()}</Text>

                {fixture.status === 'completed' && (
                  <Text style={styles.finalScore}>
                    Final: {fixture.actual_home_score} - {fixture.actual_away_score}
                  </Text>
                )}

                {mine ? (
                  <Text style={styles.myPrediction}>
                    Your prediction: {mine.predicted_home_score} - {mine.predicted_away_score}
                    {mine.points_awarded !== null ? ` (+${mine.points_awarded} pts)` : ''}
                  </Text>
                ) : fixture.predictions_open ? (
                  <View style={styles.predictRow}>
                    <TextInput
                      style={styles.scoreInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="0"
                      placeholderTextColor={COLORS.outline}
                      value={scores[fixture.id]?.home ?? ''}
                      onChangeText={(text) =>
                        setScores((prev) => ({ ...prev, [fixture.id]: { home: text.replace(/[^0-9]/g, ''), away: prev[fixture.id]?.away ?? '' } }))
                      }
                    />
                    <Text style={styles.scoreDash}>-</Text>
                    <TextInput
                      style={styles.scoreInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="0"
                      placeholderTextColor={COLORS.outline}
                      value={scores[fixture.id]?.away ?? ''}
                      onChangeText={(text) =>
                        setScores((prev) => ({ ...prev, [fixture.id]: { home: prev[fixture.id]?.home ?? '', away: text.replace(/[^0-9]/g, '') } }))
                      }
                    />
                    <PrimaryButton
                      title="Predict"
                      onPress={() => handlePredict(fixture)}
                      loading={submittingFixtureId === fixture.id}
                      style={{ flex: 1 }}
                    />
                  </View>
                ) : (
                  <Text style={styles.meta}>Predictions closed for this fixture.</Text>
                )}

                <Pressable style={styles.commentsToggle} onPress={() => openComments(fixture)}>
                  <Ionicons name="chatbubble-outline" size={14} color={COLORS.secondary} />
                  <Text style={styles.commentsToggleText}>
                    Comments
                    {fixtureComments && !fixtureComments.loading
                      ? ` (${fixtureComments.items.length}${fixtureComments.hasMore ? '+' : ''})`
                      : ''}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
        {CommentsModal}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={visiblePredictions}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: SPACING.md, paddingTop: 10 }}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
              <Ionicons name="chevron-back" size={18} color={COLORS.secondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.screenTitle}>Predictions</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.secondary} style={{ marginTop: SPACING.lg }} />
          ) : (
            <Text style={styles.emptyText}>No prediction games are open right now - check back soon.</Text>
          )
        }
        ListFooterComponent={
          hasMorePredictions ? (
            <Pressable
              style={styles.showMoreButton}
              onPress={() => setVisiblePredictionsCount((c) => c + PREDICTIONS_PAGE_SIZE)}
            >
              <Text style={styles.showMoreText}>Show more</Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => loadDetail(item.slug)}>
            <Text style={styles.title}>{item.name}</Text>
            {!!item.description && <Text style={styles.subtitle}>{item.description}</Text>}
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>Ends {new Date(item.ends_at).toLocaleDateString()}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { padding: SPACING.md, gap: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  backText: { color: COLORS.secondary, fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    gap: 6,
    marginBottom: SPACING.md,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface, flexShrink: 1 },
  subtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },
  meta: { fontSize: 12, color: COLORS.outline },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closedBadge: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  finalScore: { fontSize: 14, fontWeight: '700', color: COLORS.secondary },
  myPrediction: { fontSize: 13, color: COLORS.onSurfaceVariant, fontWeight: '600' },
  predictRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  scoreInput: {
    width: 44,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  scoreDash: { fontSize: 16, color: COLORS.onSurfaceVariant },
  emptyText: { color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.lg, fontSize: 14 },
  showMoreButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  showMoreText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  commentsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  commentsToggleText: { color: COLORS.secondary, fontWeight: '600', fontSize: 13 },
  commentRow: { gap: 2, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface },
  commentBody: { fontSize: 13, color: COLORS.onSurfaceVariant },
  commentsBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  commentsSheet: {
    height: '78%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  commentsHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface, flex: 1, marginRight: SPACING.sm },
  commentsList: { flex: 1 },
  commentsListContent: { padding: SPACING.md, flexGrow: 1 },
  commentComposer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    gap: 8,
  },
  commentNameInput: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.onSurface,
  },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  commentBodyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.onSurface,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
});
