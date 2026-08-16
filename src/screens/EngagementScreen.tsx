import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { useActiveRaffles } from '../services/raffleQueries';

interface EngagementItem {
  label: string;
  description: string;
  icon: string;
  route: string;
}

const ALWAYS_ON_ITEMS: EngagementItem[] = [
  { label: 'Predictions', description: 'Call the score, earn points', icon: 'football', route: 'Predictions' },
  { label: 'Quizzes', description: 'Test what you know', icon: 'help-circle', route: 'Quizzes' },
  { label: 'Leaderboard', description: 'See who is on top', icon: 'trophy', route: 'Leaderboard' },
];

const RAFFLE_ITEM: EngagementItem = {
  label: 'Raffles',
  description: 'Enter for a chance to win',
  icon: 'pricetag',
  route: 'Raffle',
};

/**
 * Arena's home - one big tappable row per engagement feature, each pushing
 * its own screen (not a modal, see RootNavigator). Raffles only appears
 * when there's actually a raffle open - an empty "Raffles" entry that leads
 * to a "nothing running" screen isn't worth showing.
 */
export default function EngagementScreen({ navigation }: any) {
  const { data: raffles, isLoading: rafflesLoading, refetch: refetchRaffles } = useActiveRaffles();
  const showRaffles = raffles && raffles.length > 0;

  // Tab screens stay mounted in React Navigation, so the initial fetch's
  // staleTime alone won't catch a raffle admin closes server-side while
  // this tab isn't focused - refetch every time Arena comes back into
  // view instead of requiring an app restart to notice.
  useFocusEffect(
    useCallback(() => {
      refetchRaffles();
    }, [refetchRaffles])
  );

  const items = (!rafflesLoading && showRaffles) ? [ALWAYS_ON_ITEMS[0], RAFFLE_ITEM, ...ALWAYS_ON_ITEMS.slice(1)] : ALWAYS_ON_ITEMS;

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.route}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Arena</Text>
            <Text style={styles.subtitle}>Predict, play, and climb the leaderboard.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate(item.route)}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={26} color={COLORS.surface} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.outline} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { padding: SPACING.md, gap: SPACING.xs },
  header: { marginBottom: SPACING.sm },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface },
  cardDescription: { fontSize: 13, color: COLORS.onSurfaceVariant },
});
