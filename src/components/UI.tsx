import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

// --- Card ---
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// --- Buttons ---
interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function PrimaryButton({ title, onPress, loading, disabled, icon, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.onPrimary} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          <Text style={styles.primaryButtonText}>{title.toUpperCase()}</Text>
          {icon}
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, loading, disabled, icon, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.secondary} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon}
          <Text style={styles.secondaryButtonText}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// --- Input ---
interface InputGroupProps extends TextInputProps {
  label: string;
}

export function InputGroup({ label, style, ...rest }: InputGroupProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={COLORS.outline}
        {...rest}
      />
    </View>
  );
}

// --- Badge ---
type BadgeVariant = 'breaking' | 'premium' | 'active';

export function Badge({ text, variant = 'active' }: { text: string; variant?: BadgeVariant }) {
  return (
    <View style={[styles.badge, badgeVariantStyles[variant]]}>
      <Text style={[styles.badgeText, badgeTextVariantStyles[variant]]}>
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: COLORS.outline,
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  inputGroup: {
    gap: 6,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: COLORS.onSurfaceVariant,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLowest,
    color: COLORS.onSurface,
    fontSize: 16,
    borderRadius: RADIUS.sm,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

const badgeVariantStyles: Record<BadgeVariant, ViewStyle> = {
  breaking: { backgroundColor: COLORS.onTertiaryContainer },
  premium: { backgroundColor: COLORS.secondary },
  active: { backgroundColor: COLORS.surfaceContainerHighest },
};

const badgeTextVariantStyles: Record<BadgeVariant, { color: string }> = {
  breaking: { color: COLORS.onTertiary },
  premium: { color: COLORS.onSecondary },
  active: { color: COLORS.onSurface },
};
