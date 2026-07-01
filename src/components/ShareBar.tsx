import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { CHANNEL_LINKS } from '../data/channelLinks';
import { buildFacebookShareUrl, buildTwitterShareUrl, copyLinkToClipboard } from '../utils/shareLinks';

interface ShareBarProps {
  /** Full absolute URL of the page being shared (the WordPress permalink). */
  url: string;
  /** Used as the pre-filled text for Twitter/X. */
  title: string;
}

/**
 * Social share + community-channel bar for article detail screens.
 * Ported from the web version's ShareBar.tsx.
 *
 * Instagram has no web/app share-intent URL on mobile either (same reasoning
 * as the web version) — its sharing model is app/clipboard-based by design,
 * not link-based. The Instagram action copies the link and shows a brief
 * "Link copied!" confirmation, matching the same workaround used on web.
 */
export function ShareBar({ url, title }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const openShare = (shareUrl: string) => {
    Linking.openURL(shareUrl).catch(() => {});
  };

  const handleInstagramPress = async () => {
    const ok = await copyLinkToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.group}>
        <Text style={styles.label}>SHARE</Text>

        <Pressable
          style={[styles.iconButton, styles.facebookButton]}
          onPress={() => openShare(buildFacebookShareUrl(url))}
          accessibilityLabel="Share on Facebook"
        >
          <Ionicons name="logo-facebook" size={18} color={COLORS.onSurfaceVariant} />
        </Pressable>

        <Pressable
          style={[styles.iconButton, styles.twitterButton]}
          onPress={() => openShare(buildTwitterShareUrl(url, title))}
          accessibilityLabel="Share on Twitter"
        >
          <Ionicons name="logo-twitter" size={18} color={COLORS.onSurfaceVariant} />
        </Pressable>

        <View>
          <Pressable
            style={[styles.iconButton, styles.instagramButton]}
            onPress={handleInstagramPress}
            accessibilityLabel="Copy link to share on Instagram"
          >
            <Ionicons
              name={copied ? 'link' : 'logo-instagram'}
              size={18}
              color={COLORS.onSurfaceVariant}
            />
          </Pressable>
          {copied && (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>Link copied!</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.group}>
        {CHANNEL_LINKS.map((channel) => (
          <Pressable
            key={channel.label}
            style={styles.channelLink}
            onPress={() => openShare(channel.href)}
          >
            <Ionicons name={channel.icon} size={15} color={COLORS.secondary} />
            <Text style={styles.channelLinkText}>Join on {channel.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    gap: SPACING.md,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: COLORS.outline,
    marginRight: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facebookButton: {},
  twitterButton: {},
  instagramButton: {},
  toast: {
    position: 'absolute',
    bottom: 44,
    alignSelf: 'center',
    backgroundColor: COLORS.onSurface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  toastText: { color: COLORS.surface, fontSize: 11, fontWeight: '600' },
  channelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceContainer,
  },
  channelLinkText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
});
