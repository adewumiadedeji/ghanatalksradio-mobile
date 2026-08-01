import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { useVerifyRafflePayment } from '../services/raffleQueries';

const REDIRECT_MARKER = 'raffle_payment_redirect';

export default function RafflePaymentScreen({ route, navigation }: any) {
  const { checkoutUrl, txRef } = route.params as { checkoutUrl: string; txRef: string };
  const token = useUserStore((s) => s.user?.token);
  const queryClient = useQueryClient();
  const verifyPayment = useVerifyRafflePayment();

  const [isVerifying, setIsVerifying] = useState(false);
  const handledRedirect = useRef(false);

  const handleNavigationChange = useCallback(
    (navState: WebViewNavigation) => {
      // Only reacts to the redirect landing page to know payment finished -
      // never trusts any status/tx_ref query params in navState.url itself.
      // The real answer always comes from the server-to-server verify call below.
      if (handledRedirect.current || !navState.url.includes(REDIRECT_MARKER)) return;
      handledRedirect.current = true;
      setIsVerifying(true);

      if (!token) return;
      verifyPayment.mutate(
        { token, txRef },
        {
          onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['raffles', 'active'] });
            queryClient.invalidateQueries({ queryKey: ['raffles', 'my-entries'] });
            navigation.goBack();
            Alert.alert('Entry confirmed!', `Your raffle number is ${result.raffleNumber}. Good luck!`);
          },
          onError: (err) => {
            setIsVerifying(false);
            handledRedirect.current = false;
            Alert.alert(
              'Payment not confirmed',
              err instanceof Error ? err.message : 'We could not confirm this payment. Please try again.'
            );
          },
        }
      );
    },
    [token, txRef, verifyPayment, queryClient, navigation]
  );

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} disabled={isVerifying}>
          <Ionicons name="close" size={24} color={COLORS.onSurfaceVariant} />
        </Pressable>
        <Text style={styles.title}>Complete Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      {isVerifying ? (
        <View style={[styles.flex, styles.centered]}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.verifyingText}>Confirming your payment…</Text>
        </View>
      ) : (
        <WebView source={{ uri: checkoutUrl }} onNavigationStateChange={handleNavigationChange} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  centered: { alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface },
  verifyingText: { color: COLORS.onSurfaceVariant, fontSize: 14 },
});
