import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, Pressable, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { Badge, PrimaryButton } from '../components/UI';
import { GuestGate } from '../components/GuestGate';
import { useContentStore } from '../store/contentStore';
import { useUserStore } from '../store/userStore';
import { Raffle } from '../types';

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function RaffleScreen({ navigation }: any) {
  const raffles = useContentStore((s) => s.raffles);
  const enterRaffle = useContentStore((s) => s.enterRaffle);
  const recentWinners = useContentStore((s) => s.recentWinners);
  const user = useUserStore((s) => s.user);
  const spendPoints = useUserStore((s) => s.spendPoints);
  const addRaffleEntry = useUserStore((s) => s.addRaffleEntry);

  const [timers, setTimers] = useState<Record<string, number>>(
    () => Object.fromEntries(raffles.map((r) => [r.id, r.timeRemainingSec]))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next: Record<string, number> = {};
        for (const [id, secs] of Object.entries(prev)) {
          next[id] = Math.max(0, secs - 1);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEnter = (raffle: Raffle) => {
    if (!spendPoints(raffle.cost)) {
      Alert.alert('Not enough points', `You need ${raffle.cost} points to enter this raffle.`);
      return;
    }
    enterRaffle(raffle.id, 1);
    addRaffleEntry({ raffleId: raffle.id, enteredAt: new Date().toISOString(), tickets: 1 });
    Alert.alert('Entry confirmed!', `You're entered into "${raffle.title}". Good luck!`);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.flex}>
        <GuestGate
          icon="pricetag"
          title="Sign In to Enter Raffles"
          message="Create a free account to earn points and enter raffles for prizes like smartphones and shopping vouchers."
          onSignIn={() => navigation.navigate('AuthModal', { screen: 'Login' })}
          onSignUp={() => navigation.navigate('AuthModal', { screen: 'SignUp' })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={raffles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: SPACING.sm, marginBottom: SPACING.md }}>
            <Text style={styles.screenTitle}>Raffles</Text>
            <View style={styles.pointsPill}>
              <Text style={styles.pointsText}>{user?.points ?? 0} points available</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.body}>
              <View style={styles.badgeRow}>
                {item.endingSoon && <Badge text="Ending Soon" variant="breaking" />}
                <Badge text={item.category} variant="active" />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
              </View>
              <Text style={styles.meta}>
                {item.totalEntered.toLocaleString()} entered · {formatTime(timers[item.id] ?? 0)} left
              </Text>

              <PrimaryButton
                title={`Enter for ${item.cost} pts`}
                onPress={() => handleEnter(item)}
                style={{ marginTop: SPACING.sm }}
              />
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.winnersSection}>
            <Text style={styles.sectionTitle}>Recent Winners</Text>
            {recentWinners.map((winner, idx) => (
              <Text key={idx} style={styles.winnerLine}>
                🎉 {winner}
              </Text>
            ))}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { padding: SPACING.md, gap: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  pointsPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondaryContainer,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
  },
  pointsText: { color: COLORS.onSecondaryContainer, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.md,
  },
  image: { width: '100%', height: 160 },
  body: { padding: SPACING.md, gap: 6 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceContainer,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.secondary },
  meta: { fontSize: 12, color: COLORS.outline, marginTop: 4 },
  winnersSection: { marginTop: SPACING.md, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  winnerLine: { fontSize: 13, color: COLORS.onSurfaceVariant },
});
