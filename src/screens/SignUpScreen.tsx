import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Card, PrimaryButton, InputGroup } from '../components/UI';
import { COLORS, SPACING } from '../theme/colors';
import { useUserStore } from '../store/userStore';

export default function SignUpScreen({ navigation }: any) {
  const signUp = useUserStore((s) => s.signUp);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!fullName || !email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service to continue.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      await signUp(fullName, email, password, phone || undefined);
      navigation.getParent()?.goBack();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={styles.closeButton}
          onPress={() => navigation.getParent()?.goBack()}
          hitSlop={10}
        >
          <Ionicons name="close" size={26} color={COLORS.onSurfaceVariant} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Create an Account</Text>
          <Text style={styles.subtitle}>
            Join GhanaTalksRadio and get +1,000 bonus points instantly.
          </Text>
        </View>

        <Card>
          {!!errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <InputGroup label="Full Name" placeholder="Kwame Mensah" value={fullName} onChangeText={setFullName} />
          <InputGroup
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputGroup
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <InputGroup
            label="Phone Number (optional)"
            placeholder="024 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Pressable style={styles.checkboxRow} onPress={() => setAgreeTerms((v) => !v)}>
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms && <Ionicons name="checkmark" size={14} color={COLORS.onPrimary} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </Pressable>

          <PrimaryButton
            title="Create Account"
            onPress={handleSubmit}
            loading={isLoading}
            style={{ marginTop: SPACING.sm }}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
              Sign In
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  closeButton: { alignSelf: 'flex-end', padding: SPACING.sm },
  container: {
    flexGrow: 1,
    padding: SPACING.md,
    gap: SPACING.xl,
    justifyContent: 'center',
  },
  header: { alignItems: 'center', gap: SPACING.sm },
  title: { fontSize: 26, fontWeight: '600', color: COLORS.onSurface },
  subtitle: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 21,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  checkboxLabel: { flex: 1, fontSize: 13, color: COLORS.onSurfaceVariant },
  footer: { alignItems: 'center' },
  footerText: { color: COLORS.onSurfaceVariant, fontSize: 15, textAlign: 'center' },
  link: { color: COLORS.secondary, fontWeight: '600' },
});
