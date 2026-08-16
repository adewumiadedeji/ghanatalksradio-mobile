import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { PrimaryButton } from './UI';

function daysRemaining(graceEndsAt: string | null): number | null {
  if (!graceEndsAt) return null;
  const ms = new Date(graceEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Dismissible per-session nag (see appVersionStore's docblock on why it
 * isn't persisted) - shown when update_available is true but force_update
 * isn't yet. The countdown is purely informational: the actual deadline
 * is enforced server-side (PublicAppVersionController flips force_update
 * on once the grace period elapses), this just tells the listener the
 * same number so "Later" doesn't feel like an empty gesture.
 */
export function UpdateAvailableModal({
  visible,
  storeUrl,
  releaseNotes,
  gracePeriodEndsAt,
  onDismiss,
}: {
  visible: boolean;
  storeUrl: string | null;
  releaseNotes: string | null;
  gracePeriodEndsAt: string | null;
  onDismiss: () => void;
}) {
  const days = daysRemaining(gracePeriodEndsAt);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.iconCircle}>
            <Ionicons name="arrow-up-circle-outline" size={32} color={COLORS.onSecondary} />
          </View>
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.message}>
            A new version of GhanaTalksRadio is ready.
            {days !== null && days > 0
              ? ` Update within ${days} day${days === 1 ? '' : 's'} to keep using the app without interruption.`
              : ' Update soon to keep using the app without interruption.'}
          </Text>
          {!!releaseNotes && <Text style={styles.notes}>{releaseNotes}</Text>}
          <PrimaryButton
            title="Update Now"
            onPress={() => storeUrl && Linking.openURL(storeUrl)}
            disabled={!storeUrl}
            style={{ width: '100%', marginTop: SPACING.md }}
          />
          <Pressable onPress={onDismiss} style={styles.laterButton}>
            <Text style={styles.laterText}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface, marginBottom: 6 },
  message: { fontSize: 13, color: COLORS.onSurfaceVariant, textAlign: 'center', lineHeight: 19 },
  notes: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  laterButton: { marginTop: SPACING.sm, padding: SPACING.sm },
  laterText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
});
