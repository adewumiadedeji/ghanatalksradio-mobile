import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Card, PrimaryButton, InputGroup } from '../components/UI';
import { COLORS, SPACING } from '../theme/colors';
import { useForgotPasswordMutation } from '../services/authQueries';

export default function ForgotPasswordScreen({ navigation }: any) {
  const forgotPassword = useForgotPasswordMutation();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    setErrorMessage('');
    try {
      await forgotPassword.mutateAsync(email);
      navigation.navigate('ConfirmResetPin', { email });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={16} color={COLORS.onSurfaceVariant} />
          <Text style={styles.backLinkText}>Back to Sign In</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter the email address on your account and we'll send you a 6-digit code to reset your password.
          </Text>
        </View>

        <Card>
          {!!errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <InputGroup
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <PrimaryButton
            title="Send Reset Code"
            onPress={handleSubmit}
            loading={forgotPassword.isPending}
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
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, position: 'absolute', top: SPACING.md, left: SPACING.md },
  backLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
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
