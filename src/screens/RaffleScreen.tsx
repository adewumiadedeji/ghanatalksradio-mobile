import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { PrimaryButton } from '../components/UI';
import { GuestGate } from '../components/GuestGate';
import { useContentStore } from '../store/contentStore';
import { useUserStore } from '../store/userStore';
import {
  useActiveRaffles,
  useInitiateRafflePayment,
  useRafflePreviewAmount,
} from '../services/raffleQueries';
import { RaffleDto } from '../services/raffleApi';
import { getDeviceId } from '../utils/deviceId';
import { RAFFLE_CURRENCIES } from '../data/currencies';

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function secondsUntil(dateString: string) {
  const ms = new Date(dateString.replace(' ', 'T')).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

export default function RaffleScreen({ navigation }: any) {
  const { data: raffles, isLoading, isError } = useActiveRaffles();
  const recentWinners = useContentStore((s) => s.recentWinners);
  const user = useUserStore((s) => s.user);
  const initiatePayment = useInitiateRafflePayment();

  const [timers, setTimers] = useState<Record<number, number>>({});
  const [numberInputs, setNumberInputs] = useState<Record<number, string>>({});
  const [enteringRaffleId, setEnteringRaffleId] = useState<number | null>(null);
  const [currency, setCurrency] = useState('GHS');
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  useEffect(() => {
    if (!raffles) return;
    setTimers(Object.fromEntries(raffles.map((r: RaffleDto) => [r.id, secondsUntil(r.enddate)])));
  }, [raffles]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next: Record<number, number> = {};
        for (const [id, secs] of Object.entries(prev)) {
          next[Number(id)] = Math.max(0, secs - 1);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEnter = async (raffle: RaffleDto) => {
    if (!user) return;
    const raffleNumber = (numberInputs[raffle.id] ?? '').trim();
    if (!/^\d{3}$/.test(raffleNumber)) {
      Alert.alert('Choose a number', 'Please enter a 3-digit number (000-999) to enter this raffle.');
      return;
    }

    if (raffle.payment_mode === 'dev') {
      // This specific raffle is flagged dev-mode by the backend (wp_raffle.payment_mode) -
      // no payment API is called and no payment screen is ever shown; entries
      // aren't recorded server-side.
      Alert.alert('Entry confirmed!', `Your raffle number is ${raffleNumber}. Good luck!`);
      return;
    }

    setEnteringRaffleId(raffle.id);
    try {
      const deviceId = await getDeviceId();
      const result = await initiatePayment.mutateAsync({
        token: user.token,
        raffleId: raffle.id,
        raffleNumber,
        phone: user.phone ?? '',
        deviceId,
        currency,
      });
      navigation.navigate('RafflePayment', { checkoutUrl: result.checkoutUrl, txRef: result.txRef });
    } catch (e) {
      Alert.alert('Could not start payment', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setEnteringRaffleId(null);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.flex}>
        <GuestGate
          icon="pricetag"
          title="Sign In to Enter Raffles"
          message="Create a free account to enter raffles for prizes like smartphones and shopping vouchers."
          onSignIn={() => navigation.navigate('AuthModal', { screen: 'Login' })}
          onSignUp={() => navigation.navigate('AuthModal', { screen: 'SignUp' })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={raffles ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>Raffles</Text>
            {(raffles ?? []).some((r) => r.payment_mode === 'prod') && (
              <Pressable style={styles.currencyChip} onPress={() => setCurrencyPickerVisible(true)}>
                <Text style={styles.currencyChipText}>{currency}</Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.onSecondaryContainer} />
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.secondary} style={{ marginTop: SPACING.lg }} />
          ) : isError ? (
            <Text style={styles.emptyText}>Couldn't load raffles right now.</Text>
          ) : (
            <Text style={styles.emptyText}>No raffles are open right now - check back soon.</Text>
          )
        }
        renderItem={({ item }) => {
          const timeLeft = timers[item.id] ?? secondsUntil(item.enddate);
          const endingSoon = timeLeft < 24 * 3600;
          return (
            <View style={styles.card}>
              <View style={styles.body}>
                <View style={styles.badgeRow}>
                  {endingSoon && (
                    <View style={styles.endingSoonBadge}>
                      <Text style={styles.endingSoonText}>Ending Soon</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.title}>{item.name}</Text>
                {!!item.toWin && <Text style={styles.subtitle}>{item.toWin}</Text>}
                {!!item.amount_to_win && <Text style={styles.prizeValue}>Worth {item.amount_to_win}</Text>}

                <Text style={styles.meta}>
                  {item.entries_count.toLocaleString()} entered · {formatTime(timeLeft)} left
                </Text>

                <View style={styles.numberRow}>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="000"
                    placeholderTextColor={COLORS.outline}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={numberInputs[item.id] ?? ''}
                    onChangeText={(text) =>
                      setNumberInputs((prev) => ({ ...prev, [item.id]: text.replace(/[^0-9]/g, '') }))
                    }
                  />
                  <EnterButton
                    raffle={item}
                    currency={currency}
                    token={user.token}
                    onPress={() => handleEnter(item)}
                    loading={enteringRaffleId === item.id}
                  />
                </View>
              </View>
            </View>
          );
        }}
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

      <Modal
        visible={currencyPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCurrencyPickerVisible(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setCurrencyPickerVisible(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Pay in</Text>
            <FlatList
              data={RAFFLE_CURRENCIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item: c }) => (
                <Pressable
                  style={styles.pickerRow}
                  onPress={() => {
                    setCurrency(c.code);
                    setCurrencyPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerRowCode}>{c.code}</Text>
                  <Text style={styles.pickerRowLabel}>{c.label}</Text>
                  {c.code === currency && (
                    <Ionicons name="checkmark" size={18} color={COLORS.secondary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function EnterButton({
  raffle,
  currency,
  token,
  onPress,
  loading,
}: {
  raffle: RaffleDto;
  currency: string;
  token: string;
  onPress: () => void;
  loading: boolean;
}) {
  const isPaid = raffle.payment_mode === 'prod';
  const isBaseCurrency = currency === 'GHS';
  const preview = useRafflePreviewAmount(
    token,
    isPaid && !isBaseCurrency ? raffle.id : null,
    currency
  );

  if (!isPaid) {
    return <PrimaryButton title="Enter" onPress={onPress} loading={loading} style={{ flex: 1 }} />;
  }

  const title = isBaseCurrency
    ? `Enter for GHS ${raffle.amount}`
    : preview.data
      ? `Enter for ${preview.data.currency} ${preview.data.amount}`
      : 'Enter';

  return (
    <PrimaryButton
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={!isBaseCurrency && (preview.isLoading || !preview.data)}
      style={{ flex: 1 }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { padding: SPACING.md, gap: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondaryContainer,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
  },
  currencyChipText: { fontSize: 13, fontWeight: '700', color: COLORS.onSecondaryContainer },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.md,
    maxHeight: '70%',
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface, marginBottom: SPACING.sm },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  pickerRowCode: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface, width: 44 },
  pickerRowLabel: { flex: 1, fontSize: 14, color: COLORS.onSurfaceVariant },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.md,
  },
  body: { padding: SPACING.md, gap: 6 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  endingSoonBadge: {
    backgroundColor: COLORS.error,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  endingSoonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },
  prizeValue: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
  meta: { fontSize: 12, color: COLORS.outline, marginTop: 4 },
  numberRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.sm, alignItems: 'stretch' },
  numberInput: {
    width: 68,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  winnersSection: { marginTop: SPACING.md, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  winnerLine: { fontSize: 13, color: COLORS.onSurfaceVariant },
  emptyText: { color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.lg, fontSize: 14 },
});
