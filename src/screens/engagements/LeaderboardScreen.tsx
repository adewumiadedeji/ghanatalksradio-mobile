import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { useUserStore } from '../../store/userStore';
import { fetchLeaderboard, fetchMyPoints, LeaderboardEntryDto, MyPointsDto } from '../../services/leaderboardApi';

const PERIODS: { value: string; label: string }[] = [
  { value: 'all-time', label: 'All time' },
  { value: 'this-month', label: 'This month' },
];

export default function LeaderboardScreen({ navigation }: any) {
  const user = useUserStore((s) => s.user);
  const [period, setPeriod] = useState('all-time');
  const [entries, setEntries] = useState<LeaderboardEntryDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPoints, setMyPoints] = useState<MyPointsDto | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(period)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    if (!user) {
      setMyPoints(null);
      return;
    }
    fetchMyPoints(user.token)
      .then(setMyPoints)
      .catch(() => setMyPoints(null));
  }, [user]);

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={entries ?? []}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: SPACING.md, marginBottom: SPACING.sm, paddingTop: 10 }}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
              <Ionicons name="chevron-back" size={18} color={COLORS.secondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.screenTitle}>Leaderboard</Text>

            <View style={styles.periodRow}>
              {PERIODS.map((p) => (
                <Pressable
                  key={p.value}
                  style={[styles.periodChip, period === p.value && styles.periodChipActive]}
                  onPress={() => setPeriod(p.value)}
                >
                  <Text style={[styles.periodChipText, period === p.value && styles.periodChipTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {user && myPoints && (
              <View style={styles.myPointsCard}>
                <Text style={styles.myPointsLabel}>Your points</Text>
                <Text style={styles.myPointsValue}>{myPoints.balance.toLocaleString()}</Text>
                {myPoints.recent_transactions.slice(0, 3).map((t, idx) => (
                  <View key={idx} style={styles.txRow}>
                    <Text style={styles.txDescription}>{t.description ?? t.source}</Text>
                    <Text style={styles.txPoints}>+{t.points}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.secondary} style={{ marginTop: SPACING.lg }} />
          ) : (
            <Text style={styles.emptyText}>No points earned yet - be the first on the board.</Text>
          )
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.points}>{item.points.toLocaleString()}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { padding: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: COLORS.secondary, fontWeight: '600', fontSize: 14 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  periodChipActive: { backgroundColor: COLORS.secondaryContainer, borderColor: COLORS.secondaryContainer },
  periodChipText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  periodChipTextActive: { color: COLORS.onSecondaryContainer },
  myPointsCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    gap: 4,
  },
  myPointsLabel: { fontSize: 12, color: COLORS.onSurfaceVariant, fontWeight: '600' },
  myPointsValue: { fontSize: 26, fontWeight: '700', color: COLORS.secondary },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  txDescription: { fontSize: 12, color: COLORS.onSurfaceVariant, flex: 1, marginRight: 8 },
  txPoints: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  rank: { width: 24, fontSize: 14, fontWeight: '700', color: COLORS.onSurfaceVariant },
  name: { flex: 1, fontSize: 15, color: COLORS.onSurface, fontWeight: '600' },
  points: { fontSize: 15, fontWeight: '700', color: COLORS.secondary },
  emptyText: { color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.lg, fontSize: 14 },
});
