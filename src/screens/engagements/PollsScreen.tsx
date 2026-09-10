import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { useUserStore } from '../../store/userStore';
import { usePollList, useVoteMutation } from '../../services/pollsQueries';
import { PollDto, PollOptionDto } from '../../services/pollsApi';

/**
 * Moved here from DiscoverScreen's inline "Polls" section - same data hooks
 * and vote interaction, now reached from Arena as its own screen instead of
 * embedded in Discover's default content.
 */
export default function PollsScreen({ navigation }: any) {
  const user = useUserStore((s) => s.user);
  const { data: polls, isLoading: pollsLoading, refetch: refetchPolls } = usePollList(user?.token ?? null);
  const voteMutation = useVoteMutation();

  // Pushed from Arena (not a tab), but still worth a fresh check whenever a
  // listener comes back to this screen (e.g. backgrounding then returning)
  // rather than only on first mount.
  useFocusEffect(
    React.useCallback(() => {
      refetchPolls();
    }, [refetchPolls])
  );

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
      <FlatList
        data={polls ?? []}
        keyExtractor={(poll) => poll.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: SPACING.md, paddingTop: 10 }}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
              <Ionicons name="chevron-back" size={18} color={COLORS.secondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.screenTitle}>Polls</Text>
          </View>
        }
        ListEmptyComponent={
          pollsLoading ? (
            <ActivityIndicator color={COLORS.secondary} style={{ marginTop: SPACING.lg }} />
          ) : (
            <Text style={styles.emptyText}>No polls right now — check back soon.</Text>
          )
        }
        renderItem={({ item: poll }: { item: PollDto }) => {
          // Results are hidden (not "zero votes") when every option's
          // `votes` is null - see pollsApi.ts's docblock. Only show the
          // fill bar/percentages once there's a real count to show, even
          // if this device has already voted.
          const resultsHidden = poll.options.every((o) => o.votes === null);
          const totalVotes = poll.options.reduce((sum: number, o: PollOptionDto) => sum + (o.votes ?? 0), 0);
          const voted = poll.your_option_id !== null;
          const showResults = voted && !resultsHidden;
          return (
            <View style={styles.pollCard}>
              <Text style={styles.pollQuestion}>{poll.question}</Text>
              {poll.sponsor && <Text style={styles.pollSponsor}>Sponsored by {poll.sponsor.name}</Text>}
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
        }}
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
  emptyText: { textAlign: 'center', color: COLORS.onSurfaceVariant, marginTop: SPACING.md },
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
});
