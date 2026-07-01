import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useContentStore } from '../store/contentStore';
import { useUserStore } from '../store/userStore';
import { useSearchArticles } from '../services/queries';

export default function DiscoverScreen() {
  const polls = useContentStore((s) => s.polls);
  const votePoll = useContentStore((s) => s.votePoll);
  const addPoints = useUserStore((s) => s.addPoints);

  const [searchQuery, setSearchQuery] = useState('');
  const { data: results, isLoading, isError } = useSearchArticles(searchQuery);

  const handleVote = (pollId: string, optionIndex: number, rewardPoints: number) => {
    const poll = polls.find((p) => p.id === pollId);
    if (poll?.userVoteIndex !== undefined) return;
    votePoll(pollId, optionIndex);
    addPoints(rewardPoints);
  };

  const isSearching = searchQuery.trim().length > 1;

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
            <View style={{ gap: SPACING.md }}>
              <Text style={styles.sectionTitle}>Daily Poll</Text>
              {polls.map((poll) => (
                <View key={poll.id} style={styles.pollCard}>
                  <Text style={styles.pollQuestion}>{poll.question}</Text>
                  {poll.options.map((option, idx) => {
                    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
                    const pct = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
                    const voted = poll.userVoteIndex !== undefined;
                    return (
                      <Pressable
                        key={idx}
                        style={styles.pollOption}
                        onPress={() => handleVote(poll.id, idx, poll.rewardPoints)}
                        disabled={voted}
                      >
                        {voted && <View style={[styles.pollFill, { width: `${pct}%` }]} />}
                        <Text style={styles.pollOptionText}>{option.text}</Text>
                        {voted && <Text style={styles.pollPct}>{pct}%</Text>}
                      </Pressable>
                    );
                  })}
                  {poll.userVoteIndex === undefined && (
                    <Text style={styles.pollReward}>Vote to earn +{poll.rewardPoints} points</Text>
                  )}
                </View>
              ))}
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
  resultCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  resultCategory: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, marginBottom: 4 },
  resultTitle: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface },
  emptyText: { textAlign: 'center', color: COLORS.onSurfaceVariant, marginTop: SPACING.xl },
});
