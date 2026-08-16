import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { PrimaryButton } from '../../components/UI';
import { useUserStore } from '../../store/userStore';
import {
  useActiveRaffles,
  useEnterRaffleFree,
  useEnterRafflePaid,
  useInitiateCheckout,
  useSupportedCurrencies,
  usePreviewAmount,
} from '../../services/raffleQueries';
import { RaffleDto } from '../../services/raffleApi';
import { STREAMING_API_BASE_URL } from '../../services/streamingApi';
import { CURRENCY_LABELS } from '../../data/currencyLabels';

// Matches RafflePaymentScreen's REDIRECT_MARKER - the checkout WebView
// just needs to navigate to a URL containing this string to be detected
// as "payment flow finished"; the page it points to doesn't need to
// render anything meaningful (see RafflePaymentScreen's docblock).
const CHECKOUT_REDIRECT_URL = `${STREAMING_API_BASE_URL}/raffle_payment_redirect`;

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

function formatRuleDate(dateString: string): string {
  return new Date(dateString.replace(' ', 'T')).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Official rules are per-raffle, not a single static block - sponsor name,
 * prize, entry method, and draw dates all differ per raffle, so every
 * paragraph is built from the real RaffleDto rather than left as a
 * fill-in-the-blank template (the version this replaced had literal
 * "[start]"/"[+ full legal entity name]" placeholders still in it).
 */
function buildRaffleRules(raffle: RaffleDto): string[] {
  const sponsorName = raffle.sponsor?.name;

  const entryLine = raffle.allow_free_entry
    ? 'No purchase necessary to enter or win. A free entry option is always available.'
    : 'This raffle requires a paid entry - no free entry option is available for this draw.';

  const howToEnter =
    raffle.allow_free_entry && raffle.entry_price !== null
      ? `Enter for free, or buy additional tickets for ${raffle.entry_currency} ${raffle.entry_price} each, directly in the GhanaTalksRadio app. One free entry per user per draw.`
      : raffle.allow_free_entry
        ? 'Enter for free directly in the GhanaTalksRadio app. One entry per user per draw.'
        : raffle.entry_price !== null
          ? `Enter by purchasing a ticket for ${raffle.entry_currency} ${raffle.entry_price} directly in the GhanaTalksRadio app.`
          : 'Enter directly in the GhanaTalksRadio app.';

  return [
    entryLine,
    // GhanaTalksRadio is always the contest sponsor/administrator of
    // record (matches the app's App Store seller) - a partner is credited
    // as the prize provider, not described as running the sweepstakes,
    // per Apple's guideline 5.3.1 requirement that the sponsor be the
    // entity that publishes the app.
    sponsorName
      ? `Sponsor: This raffle is sponsored and administered by GhanaTalksRadio. Prize provided in partnership with ${sponsorName}.`
      : 'Sponsor: This raffle is sponsored and administered by GhanaTalksRadio.',
    `Eligibility: Open to residents of Ghana aged 18 or older at time of entry. Employees of GhanaTalksRadio${sponsorName ? ` and ${sponsorName}` : ''} and their immediate families are not eligible.`,
    `How to enter: ${howToEnter}`,
    `Draw period: This draw opens ${formatRuleDate(raffle.starts_at)} and closes ${formatRuleDate(raffle.entries_close_at)}. Winners are selected at random from all valid entries.`,
    'Odds: Odds of winning depend on the number of eligible entries received for this draw.',
    `Prize: ${raffle.name}.${raffle.description ? ` ${raffle.description}` : ''}${raffle.number_of_winners !== null ? ` ${raffle.number_of_winners} winner(s) will be selected.` : ''} Prizes are non-transferable and cannot be exchanged for cash.`,
    'Winner notification: Winners are notified in-app and/or via the contact details provided at entry, within 7 days of the draw closing.',
    'Apple is not a sponsor of, and is not involved in, this raffle in any way.',
  ];
}

/**
 * Shown when there's no active raffle to pull specific terms from - the
 * program-level rules stay reachable at all times (Apple guideline
 * 5.3.2) rather than only existing while a raffle happens to be running.
 */
function buildGenericRaffleRules(): string[] {
  return [
    'GhanaTalksRadio periodically runs free-to-enter raffles for real-world prizes inside the app. Check back here for the current draw - specific terms (prize, dates, odds) are published for each raffle while it is open.',
    'Sponsor: All raffles are sponsored and administered by GhanaTalksRadio. Some prizes are provided in partnership with a third-party brand, credited on that raffle.',
    'Eligibility: Open to residents of Ghana aged 18 or older at time of entry. Employees of GhanaTalksRadio and their immediate families are not eligible.',
    'How to enter: When a raffle is open, enter directly in the GhanaTalksRadio app - a free entry option is always offered.',
    'Odds: Odds of winning depend on the number of eligible entries received for each draw.',
    'Winner notification: Winners are notified in-app and/or via the contact details provided at entry, within 7 days of a draw closing.',
    'Apple is not a sponsor of, and is not involved in, any GhanaTalksRadio raffle in any way.',
  ];
}


/** Shows the ticket total in whichever currency is selected - a plain
 * calculation when it matches the raffle's own entry_currency, otherwise
 * a live-converted preview (see PublicRaffleController::previewAmount()) -
 * this is the whole reason Flutterwave was chosen as the payment gateway
 * (real multi-currency hosted checkout), not just a display nicety. */
function PayButton({
  raffle,
  currency,
  ticketCount,
  onPress,
  loading,
}: {
  raffle: RaffleDto;
  currency: string;
  ticketCount: number;
  onPress: () => void;
  loading: boolean;
}) {
  const isNativeCurrency = currency === raffle.entry_currency;
  const preview = usePreviewAmount(isNativeCurrency ? null : raffle.slug, currency, ticketCount);

  const title = isNativeCurrency
    ? `Pay ${raffle.entry_currency} ${((raffle.entry_price ?? 0) * ticketCount).toFixed(2)}`
    : preview.data
      ? `Pay ${preview.data.currency} ${preview.data.amount.toFixed(2)}`
      : 'Pay';

  return (
    <PrimaryButton
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={!isNativeCurrency && (preview.isLoading || !preview.data)}
      style={{ flex: 1 }}
    />
  );
}

export default function RaffleScreen({ navigation }: any) {
  const { data: raffles, isLoading, isError, refetch: refetchRaffles } = useActiveRaffles();
  const user = useUserStore((s) => s.user);

  // Same reasoning as EngagementScreen's focus refetch - a raffle closed
  // server-side shouldn't need an app restart to disappear from here.
  useFocusEffect(
    useCallback(() => {
      refetchRaffles();
    }, [refetchRaffles])
  );
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [enteringSlug, setEnteringSlug] = useState<string | null>(null);
  const [currency, setCurrency] = useState('GHS');
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [rulesRaffleSlug, setRulesRaffleSlug] = useState<string | null>(null);
  const rulesRaffle = (raffles ?? []).find((r) => r.slug === rulesRaffleSlug) ?? null;
  const [detailsRaffleSlug, setDetailsRaffleSlug] = useState<string | null>(null);
  const detailsRaffle = (raffles ?? []).find((r) => r.slug === detailsRaffleSlug) ?? null;
  // Set right before navigating to AuthModal when a guest taps "Enter
  // Raffle" on a free-entry raffle - only for free entry, never paid,
  // so signing up never silently spends real money on the guest's
  // behalf. Paid raffles just reveal the normal ticket-stepper/Pay
  // controls once signed in, for the user to explicitly confirm.
  const [pendingFreeEntrySlug, setPendingFreeEntrySlug] = useState<string | null>(null);
  // Header-level, always rendered (unlike the per-card links, which only
  // exist while that specific raffle is listed) - the program-level
  // rules stay reachable even with zero raffles currently open.
  const [genericRulesVisible, setGenericRulesVisible] = useState(false);
  const { data: supportedCurrencies } = useSupportedCurrencies();
  const enterFree = useEnterRaffleFree();
  const enterPaid = useEnterRafflePaid();
  const initiateCheckout = useInitiateCheckout();

  useEffect(() => {
    if (!raffles) return;
    setTimers(Object.fromEntries(raffles.map((r) => [r.slug, secondsUntil(r.entries_close_at)])));
  }, [raffles]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next: Record<string, number> = {};
        for (const [slug, secs] of Object.entries(prev)) next[slug] = Math.max(0, secs - 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Browsing raffles and their official rules stays open to guests
  // (Apple guideline 5.3.2 requires rules to be available to users at all
  // times, not only after creating an account) - only actually entering
  // requires signing in, prompted per-action below rather than gating the
  // whole screen behind a GuestGate.
  const handleEnterFree = async (raffle: RaffleDto) => {
    if (!user) return;
    setEnteringSlug(raffle.slug);
    try {
      await enterFree.mutateAsync({ slug: raffle.slug, token: user.token });
      Alert.alert('Entry recorded!', `You're in the "${raffle.name}" raffle. Good luck!`);
    } catch (e) {
      Alert.alert('Could not enter', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setEnteringSlug(null);
    }
  };

  const handleEnterPaid = async (raffle: RaffleDto) => {
    if (!user) return;
    const ticketCount = ticketCounts[raffle.slug] ?? 1;
    setEnteringSlug(raffle.slug);
    try {
      const result = await enterPaid.mutateAsync({ slug: raffle.slug, ticketCount, token: user.token, currency });
      if (!result.invoice) {
        Alert.alert('Entry recorded', 'Your entry request was recorded.');
        return;
      }
      const checkout = await initiateCheckout.mutateAsync({
        invoiceNumber: result.invoice.invoice_number,
        redirectUrl: CHECKOUT_REDIRECT_URL,
        token: user.token,
      });
      navigation.navigate('RafflePayment', {
        checkoutUrl: checkout.checkout_url,
        reference: checkout.reference,
        raffleName: raffle.name,
        ticketCount,
      });
    } catch (e) {
      Alert.alert('Could not enter', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setEnteringSlug(null);
    }
  };

  // Completes the entry a guest was mid-way through the moment they
  // actually finish signing in - AuthModal is presented on top of this
  // screen (RootNavigator.tsx), not a stack reset, and LoginScreen/
  // SignUpScreen's `navigation.getParent()?.goBack()` on success just
  // dismisses that overlay, so this screen (and its state) is still
  // here to resume into once `user` flips from null to real.
  useEffect(() => {
    if (!user || !pendingFreeEntrySlug) return;
    const raffle = (raffles ?? []).find((r) => r.slug === pendingFreeEntrySlug);
    setPendingFreeEntrySlug(null);
    if (raffle) handleEnterFree(raffle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleGuestEnterPress = (raffle: RaffleDto) => {
    if (raffle.allow_free_entry) setPendingFreeEntrySlug(raffle.slug);
    navigation.navigate('AuthModal', { screen: 'Login' });
  };

  const anyPaidRaffle = (raffles ?? []).some((r) => r.entry_price !== null);

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={raffles ?? []}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: SPACING.sm, paddingTop: 10 }}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
              <Ionicons name="chevron-back" size={18} color={COLORS.secondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <View style={styles.headerRow}>
              <Text style={styles.screenTitle}>Raffles</Text>
              <View style={styles.headerActions}>
                {anyPaidRaffle && (
                  <Pressable style={styles.currencyChip} onPress={() => setCurrencyPickerVisible(true)}>
                    <Text style={styles.currencyChipText}>{currency}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.onSecondaryContainer} />
                  </Pressable>
                )}
                <Pressable style={styles.rulesChip} onPress={() => setGenericRulesVisible(true)}>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.onSurfaceVariant} />
                  <Text style={styles.rulesChipText}>Official Rules</Text>
                </Pressable>
              </View>
            </View>
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
          const timeLeft = timers[item.slug] ?? secondsUntil(item.entries_close_at);
          const endingSoon = timeLeft < 24 * 3600;

          return (
            <Pressable style={styles.card} onPress={() => setDetailsRaffleSlug(item.slug)}>
              <View style={styles.body}>
                {endingSoon && (
                  <View style={styles.endingSoonBadge}>
                    <Text style={styles.endingSoonText}>Ending Soon</Text>
                  </View>
                )}
                <Text style={styles.title}>{item.name}</Text>
                {!!item.description && (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                {item.sponsor && <Text style={styles.sponsorText}>Prize provided by {item.sponsor.name}</Text>}
                {item.number_of_winners !== null && (
                  <Text style={styles.prizeValue}>{item.number_of_winners} winner(s)</Text>
                )}
                <Text style={styles.meta}>{formatTime(timeLeft)} left to enter</Text>

                <View style={styles.viewRaffleRow}>
                  <Text style={styles.viewRaffleText}>{user ? 'View & enter' : 'View raffle'}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.secondary} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal
        visible={!!detailsRaffle}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsRaffleSlug(null)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setDetailsRaffleSlug(null)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.rulesHeaderRow}>
              <Text style={styles.pickerTitle}>{detailsRaffle?.name}</Text>
              <Pressable onPress={() => setDetailsRaffleSlug(null)}>
                <Ionicons name="close" size={22} color={COLORS.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator>
              {detailsRaffle && (() => {
                const raffle = detailsRaffle;
                const timeLeft = timers[raffle.slug] ?? secondsUntil(raffle.entries_close_at);
                const ticketCount = ticketCounts[raffle.slug] ?? 1;
                const canPay = raffle.entry_price !== null && raffle.entry_currency !== null;
                const busy = enteringSlug === raffle.slug;

                return (
                  <View style={{ gap: SPACING.sm }}>
                    {!!raffle.description && <Text style={styles.rulesText}>{raffle.description}</Text>}
                    {raffle.sponsor && (
                      <Text style={styles.sponsorText}>Prize provided by {raffle.sponsor.name}</Text>
                    )}
                    {raffle.number_of_winners !== null && (
                      <Text style={styles.prizeValue}>{raffle.number_of_winners} winner(s)</Text>
                    )}
                    <Text style={styles.meta}>{formatTime(timeLeft)} left to enter</Text>

                    {user ? (
                      <>
                        {raffle.allow_free_entry && (
                          <PrimaryButton
                            title="Enter Free"
                            onPress={() => handleEnterFree(raffle)}
                            loading={busy}
                            style={{ marginTop: SPACING.sm }}
                          />
                        )}

                        {canPay && (
                          <View style={styles.numberRow}>
                            <View style={styles.stepper}>
                              <Pressable
                                style={styles.stepperButton}
                                onPress={() =>
                                  setTicketCounts((prev) => ({ ...prev, [raffle.slug]: Math.max(1, ticketCount - 1) }))
                                }
                              >
                                <Ionicons name="remove" size={16} color={COLORS.onSurface} />
                              </Pressable>
                              <Text style={styles.stepperValue}>{ticketCount}</Text>
                              <Pressable
                                style={styles.stepperButton}
                                onPress={() => setTicketCounts((prev) => ({ ...prev, [raffle.slug]: ticketCount + 1 }))}
                              >
                                <Ionicons name="add" size={16} color={COLORS.onSurface} />
                              </Pressable>
                            </View>
                            <PayButton
                              raffle={raffle}
                              currency={currency}
                              ticketCount={ticketCount}
                              onPress={() => handleEnterPaid(raffle)}
                              loading={busy}
                            />
                          </View>
                        )}
                      </>
                    ) : (
                      // Attempt-first: tapping this doesn't block on
                      // being signed in - it takes a guest straight to
                      // sign-up/sign-in, and (for free-entry raffles)
                      // finishes the entry automatically the moment
                      // they're back, see the pendingFreeEntrySlug effect
                      // above. Paid raffles reveal the ticket/Pay controls
                      // once signed in instead of auto-charging anyone.
                      <PrimaryButton
                        title="Enter Raffle"
                        onPress={() => handleGuestEnterPress(raffle)}
                        style={{ marginTop: SPACING.sm }}
                      />
                    )}

                    <Pressable
                      style={styles.rulesLink}
                      onPress={() => {
                        setDetailsRaffleSlug(null);
                        setRulesRaffleSlug(raffle.slug);
                      }}
                    >
                      <Ionicons name="information-circle-outline" size={13} color={COLORS.onSurfaceVariant} />
                      <Text style={styles.rulesLinkText}>Official Rules</Text>
                    </Pressable>
                  </View>
                );
              })()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
              data={supportedCurrencies ?? []}
              keyExtractor={(code) => code}
              renderItem={({ item: code }) => (
                <Pressable
                  style={styles.pickerRow}
                  onPress={() => {
                    setCurrency(code);
                    setCurrencyPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerRowCode}>{code}</Text>
                  <Text style={styles.pickerRowLabel}>{CURRENCY_LABELS[code] ?? code}</Text>
                  {code === currency && <Ionicons name="checkmark" size={18} color={COLORS.secondary} />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={!!rulesRaffle}
        animationType="slide"
        transparent
        onRequestClose={() => setRulesRaffleSlug(null)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setRulesRaffleSlug(null)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.rulesHeaderRow}>
              <Text style={styles.pickerTitle}>{rulesRaffle?.name} — Official Rules</Text>
              <Pressable onPress={() => setRulesRaffleSlug(null)}>
                <Ionicons name="close" size={22} color={COLORS.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator>
              {rulesRaffle &&
                buildRaffleRules(rulesRaffle).map((paragraph, idx) => (
                  <Text key={idx} style={styles.rulesText}>
                    {paragraph}
                  </Text>
                ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={genericRulesVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGenericRulesVisible(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setGenericRulesVisible(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.rulesHeaderRow}>
              <Text style={styles.pickerTitle}>Official Sweepstakes Rules</Text>
              <Pressable onPress={() => setGenericRulesVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator>
              {buildGenericRaffleRules().map((paragraph, idx) => (
                <Text key={idx} style={styles.rulesText}>
                  {paragraph}
                </Text>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { padding: SPACING.md, gap: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rulesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  rulesChipText: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: COLORS.secondary, fontWeight: '600', fontSize: 14 },
  rulesLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm, alignSelf: 'flex-start' },
  rulesLinkText: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant, textDecorationLine: 'underline' },
  rulesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  rulesText: { fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 19, marginBottom: SPACING.sm },
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
  navRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.sm },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  navChipText: { fontSize: 12, fontWeight: '700', color: COLORS.onSurface },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.md,
  },
  body: { padding: SPACING.md, gap: 6 },
  endingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.error,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  endingSoonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },
  sponsorText: { fontSize: 12, color: COLORS.onSurfaceVariant, fontStyle: 'italic' },
  prizeValue: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
  meta: { fontSize: 12, color: COLORS.outline, marginTop: 4 },
  viewRaffleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm, alignSelf: 'flex-start' },
  viewRaffleText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  numberRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.sm, alignItems: 'stretch' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  stepperButton: { paddingHorizontal: 10, paddingVertical: 12 },
  stepperValue: { minWidth: 24, textAlign: 'center', fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  emptyText: { color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.lg, fontSize: 14 },
});
