import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Card, PrimaryButton, InputGroup } from '../components/UI';
import { COLORS, SPACING } from '../theme/colors';
import { useUserStore } from '../store/userStore';

/**
 * Forced password reset for legacy (pre-bcrypt) accounts. Reached
 * automatically from LoginScreen when the server reports
 * requires_password_reset - the resetTicket it hands back is only valid
 * once and expires quickly, so there's no "skip" option here.
 */
export default function PasswordResetScreen({ route, navigation }: any) {
  const { resetTicket } = route.params as { resetTicket: string };
  const completeReset = useUserStore((s) => s.completeReset);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please fill in both fields.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      await completeReset(resetTicket, newPassword);
      navigation.getParent()?.goBack();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Set a New Password</Text>
          <Text style={styles.subtitle}>
            For your security, please set a new password for this account before continuing.
          </Text>
        </View>

        <Card>
          {!!errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <InputGroup
            label="New Password"
            placeholder="••••••••"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <InputGroup
            label="Confirm New Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <PrimaryButton
            title="Set Password & Continue"
            onPress={handleSubmit}
            loading={isLoading}
            style={{ marginTop: SPACING.sm }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  container: { flexGrow: 1, padding: SPACING.md, gap: SPACING.xl, justifyContent: 'center' },
  header: { alignItems: 'center', gap: SPACING.sm },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.onSurface, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 4,
    padding: 10,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
});
