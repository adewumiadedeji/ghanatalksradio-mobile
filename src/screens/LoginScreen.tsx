import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Card, PrimaryButton, InputGroup } from '../components/UI';
import { COLORS, SPACING } from '../theme/colors';
import { useUserStore } from '../store/userStore';

export default function LoginScreen({ navigation }: any) {
  const login = useUserStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    // Mock auth, matches web prototype's setTimeout-based flow.
    // Swap for a real auth call (e.g. WordPress JWT or a custom endpoint) when ready.
    setTimeout(() => {
      setIsLoading(false);
      login(email, '');
      navigation.getParent()?.goBack();
    }, 1200);
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
          <Text style={styles.appName}>GhanaTalksRadio</Text>
          <View style={styles.redBar} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to listen live, read the latest news, and enter raffles.
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

          <View>
            <InputGroup
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={{ paddingRight: 48 }}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={10}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.onSurfaceVariant}
              />
            </Pressable>
          </View>

          <PrimaryButton
            title="Sign In"
            onPress={handleSubmit}
            loading={isLoading}
            style={{ marginTop: SPACING.sm }}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
              Create an Account
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
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  redBar: {
    height: 6,
    width: 48,
    backgroundColor: COLORS.onTertiaryContainer,
    borderRadius: 9999,
    marginTop: 4,
    marginBottom: 8,
  },
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
  eyeButton: { position: 'absolute', right: 16, top: 38 },
  footer: { alignItems: 'center', gap: SPACING.md },
  footerText: { color: COLORS.onSurfaceVariant, fontSize: 15, textAlign: 'center' },
  link: { color: COLORS.secondary, fontWeight: '600' },
});
