import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Pressable, Alert, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { SecondaryButton } from '../components/UI';
import { GuestGate } from '../components/GuestGate';
import { ArticleDetailModal } from '../components/ArticleDetailModal';
import { useUserStore } from '../store/userStore';
import { useBookmarkedArticles } from '../services/queries';
import { useMyRaffleEntries } from '../services/raffleQueries';
import { Article } from '../types';

export default function ProfileScreen({ navigation }: any) {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const deleteAccount = useUserStore((s) => s.deleteAccount);
  const toggleBookmark = useUserStore((s) => s.toggleBookmark);
  const {
    data: bookmarkedArticles,
    isLoading: bookmarksLoading,
    isError: bookmarksError,
  } = useBookmarkedArticles(user?.bookmarkedArticleIds ?? []);
  const { data: raffleEntries } = useMyRaffleEntries(user?.token ?? null);

  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  // Likes are a local, cosmetic-only counter (same as NewsScreen.tsx) - there's
  // no WordPress likes/comments endpoint to persist them to.
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  if (!user) {
    return (
      <SafeAreaView style={styles.flex}>
        <GuestGate
          icon="person"
          title="Sign In to Your Profile"
          message="Create a free account to save articles, track your points, and manage your raffle entries."
          onSignIn={() => navigation.navigate('AuthModal', { screen: 'Login' })}
          onSignUp={() => navigation.navigate('AuthModal', { screen: 'SignUp' })}
        />
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    Alert.alert('Log out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, saved articles, and raffle history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await deleteAccount();
            } catch (e) {
              Alert.alert(
                "Couldn't delete account",
                e instanceof Error ? e.message : 'Please try again.'
              );
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={bookmarkedArticles ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: SPACING.md, marginBottom: SPACING.lg }}>
            <Text style={styles.screenTitle}>Profile</Text>

            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
              {user.isPremium && (
                <View style={styles.premiumPill}>
                  <Ionicons name="star" size={12} color={COLORS.onSecondary} />
                  <Text style={styles.premiumText}>Premium Member</Text>
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{user.points}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{user.bookmarkedArticleIds.length}</Text>
                  <Text style={styles.statLabel}>Saved</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{raffleEntries?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>Entries</Text>
                </View>
              </View>

              <SecondaryButton
                title="Change Password"
                onPress={() => navigation.navigate('ChangePassword')}
                style={{ marginTop: SPACING.md }}
              />
              <SecondaryButton title="Log Out" onPress={handleLogout} style={{ marginTop: SPACING.sm }} />
              <SecondaryButton
                title="Delete My Account"
                onPress={handleDeleteAccount}
                loading={isDeletingAccount}
                style={{ marginTop: SPACING.sm, borderColor: COLORS.error }}
                textStyle={{ color: COLORS.error }}
              />
            </View>

            <Text style={styles.sectionTitle}>Saved Articles</Text>
          </View>
        }
        ListEmptyComponent={
          bookmarksLoading ? (
            <ActivityIndicator color={COLORS.secondary} style={{ marginTop: SPACING.lg }} />
          ) : bookmarksError ? (
            <Text style={styles.emptyText}>Couldn't load saved articles right now.</Text>
          ) : (
            <Text style={styles.emptyText}>No saved articles yet — tap the bookmark icon on any article.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.bookmarkCard} onPress={() => setActiveArticle(item)}>
            <Text style={styles.bookmarkCategory}>{item.category.toUpperCase()}</Text>
            <Text style={styles.bookmarkTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        )}
      />

      <ArticleDetailModal
        article={activeArticle}
        likeCount={activeArticle ? activeArticle.likes + (localLikes[activeArticle.id] ?? 0) : 0}
        isBookmarked={!!activeArticle && !!user.bookmarkedArticleIds.includes(activeArticle.id)}
        onClose={() => setActiveArticle(null)}
        onLike={() =>
          activeArticle &&
          setLocalLikes((prev) => ({
            ...prev,
            [activeArticle.id]: (prev[activeArticle.id] ?? 0) + 1,
          }))
        }
        onBookmark={() => activeArticle && toggleBookmark(activeArticle.id)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { padding: SPACING.md },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  profileCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: COLORS.onSecondaryContainer },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  email: { fontSize: 13, color: COLORS.onSurfaceVariant },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    marginTop: 6,
  },
  premiumText: { color: COLORS.onSecondary, fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.md },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  statLabel: { fontSize: 12, color: COLORS.onSurfaceVariant },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  bookmarkCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  bookmarkCategory: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, marginBottom: 4 },
  bookmarkTitle: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface },
  emptyText: { color: COLORS.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginTop: SPACING.lg },
});
