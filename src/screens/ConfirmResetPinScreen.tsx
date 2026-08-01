import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Card, PrimaryButton, InputGroup } from '../components/UI';
import { COLORS, SPACING } from '../theme/colors';
import { useUserStore } from '../store/userStore';

export default function ConfirmResetPinScreen({ route, navigation }: any) {
  const { email } = route.params as { email: string };
  const completeResetWithPin = useUserStore((s) => s.completeResetWithPin);

  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setErrorMessage('Please enter the 6-digit code we emailed you.');
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
      await completeResetWithPin(email, pin, newPassword);
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
          <Text style={styles.title}>Enter Reset Code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to {email}. Enter it below along with your new password.
          </Text>
        </View>

        <Card>
          {!!errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <InputGroup
            label="6-Digit Code"
            placeholder="123456"
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
          />
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
            title="Reset Password"
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
