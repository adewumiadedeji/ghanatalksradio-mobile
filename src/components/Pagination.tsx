import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';

interface PaginationProps {
  page: number;
  /** Heuristic upper bound, not a true total - see PodcastPage.hasMore. */
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  if (!canGoBack && !canGoForward) return null;

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.button, !canGoBack && styles.buttonDisabled]}
        disabled={!canGoBack}
        onPress={() => onPageChange(page - 1)}
      >
        <Ionicons name="chevron-back" size={16} color={canGoBack ? COLORS.onSurface : COLORS.outline} />
        <Text style={[styles.buttonText, !canGoBack && styles.buttonTextDisabled]}>Previous</Text>
      </Pressable>

      <Text style={styles.pageLabel}>Page {page}</Text>

      <Pressable
        style={[styles.button, !canGoForward && styles.buttonDisabled]}
        disabled={!canGoForward}
        onPress={() => onPageChange(page + 1)}
      >
        <Text style={[styles.buttonText, !canGoForward && styles.buttonTextDisabled]}>Next</Text>
        <Ionicons name="chevron-forward" size={16} color={canGoForward ? COLORS.onSurface : COLORS.outline} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceContainer,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurface },
  buttonTextDisabled: { color: COLORS.outline },
  pageLabel: { fontSize: 13, color: COLORS.onSurfaceVariant, fontWeight: '600' },
});
