import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { PrimaryButton, SecondaryButton } from './UI';

interface GuestGateProps {
  icon: string;
  title: string;
  message: string;
  onSignIn: () => void;
  onSignUp: () => void;
}

export function GuestGate({ icon, title, message, onSignIn, onSignUp }: GuestGateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={COLORS.secondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.buttons}>
        <PrimaryButton title="Sign In" onPress={onSignIn} />
        <SecondaryButton title="Create an Account" onPress={onSignUp} style={{ marginTop: SPACING.sm }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface, textAlign: 'center' },
  message: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
    maxWidth: 280,
  },
  buttons: { width: '100%', maxWidth: 320 },
});
