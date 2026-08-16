import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Linking, BackHandler } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { PrimaryButton } from './UI';

/**
 * Rendered in place of the entire app (see App.tsx) when
 * appVersionStore's force_update is true - below the registered minimum
 * version, or a past "latest version" nag's grace period has elapsed.
 * Deliberately no way out: no back button (Android hardware back is
 * disabled below), no dismiss, nothing behind it to navigate to.
 */
export function UpdateRequiredScreen({ storeUrl, releaseNotes }: { storeUrl: string | null; releaseNotes: string | null }) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="cloud-download-outline" size={40} color={COLORS.onPrimary} />
        </View>
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.message}>
          This version of the app is no longer supported. Update to keep listening and using GhanaTalksRadio.
        </Text>
        {!!releaseNotes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>What's new</Text>
            <Text style={styles.notesText}>{releaseNotes}</Text>
          </View>
        )}
        <PrimaryButton
          title="Update Now"
          onPress={() => storeUrl && Linking.openURL(storeUrl)}
          disabled={!storeUrl}
          style={{ marginTop: SPACING.lg, width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.onSurface, marginBottom: SPACING.sm },
  message: { fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  notesBox: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    width: '100%',
  },
  notesTitle: { fontSize: 12, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  notesText: { fontSize: 13, color: COLORS.onSurfaceVariant },
});
