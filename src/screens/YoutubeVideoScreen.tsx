import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING } from '../theme/colors';
import { useRadioStore } from '../store/radioStore';

// Error codes the YouTube IFrame Player API reports via onError - 101/150
// mean the video's owner has disabled embedding for it (nothing fixable
// client-side), 100 means it's been removed/is private, 2 is a bad
// parameter, 5 is an HTML5 player error. Any of these means "fall back to
// opening it directly on YouTube" rather than showing a dead player.
const UNPLAYABLE_ERROR_CODES = new Set([2, 5, 100, 101, 150]);

/**
 * Loading a bare `youtube.com/embed/<id>` URL as the WebView's top-level
 * page (rather than as an <iframe> inside an actual HTML document) gives
 * YouTube's player no valid page origin to check against, which YouTube's
 * player rejects with "Error 153: Video player configuration error." Using
 * the real IFrame Player API inside a local HTML document (with a
 * same-site `origin` and a JS onError hook) fixes that and lets us detect
 * the small number of videos that genuinely can't be embedded (uploader
 * disabled it) so we can offer a working fallback instead of a dead player.
 */
function buildEmbedHtml(videoId: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>
          html, body { margin: 0; padding: 0; background: #000; height: 100%; }
          #player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="player"></div>
        <script>
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);

          function onYouTubeIframeAPIReady() {
            new YT.Player('player', {
              videoId: '${videoId}',
              playerVars: { autoplay: 1, playsinline: 1, origin: 'https://ghanatalksradio.com' },
              events: {
                onError: function (e) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', code: e.data }));
                }
              }
            });
          }
        </script>
      </body>
    </html>
  `;
}

export default function YoutubeVideoScreen({ route, navigation }: any) {
  const { videoId, title } = route.params as { videoId: string; title: string };
  const [unplayable, setUnplayable] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Prevent the live radio stream's audio from playing under the video's
  // own audio. Only resume on the way out if we're the ones who paused it -
  // if the user had already paused the radio themselves before opening this
  // screen, leave it paused.
  const pausedRadioRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const { playbackState, pause } = useRadioStore.getState();
      if (playbackState === 'playing') {
        pausedRadioRef.current = true;
        pause();
      }
      return () => {
        if (pausedRadioRef.current) {
          pausedRadioRef.current = false;
          useRadioStore.getState().resume();
        }
      };
    }, [])
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error' && UNPLAYABLE_ERROR_CODES.has(data.code)) {
        setUnplayable(true);
      }
    } catch {
      // ignore malformed/unexpected messages
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={24} color={COLORS.onSurfaceVariant} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {unplayable ? (
        <View style={styles.fallback}>
          <Ionicons name="logo-youtube" size={48} color={COLORS.error} />
          <Text style={styles.fallbackText}>This video can't be played here.</Text>
          <Pressable style={styles.fallbackButton} onPress={() => Linking.openURL(watchUrl).catch(() => {})}>
            <Text style={styles.fallbackButtonText}>Watch on YouTube</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          // baseUrl gives this injected HTML a real https:// origin (rather
          // than about:blank/null) - without it, the 'origin' playerVar
          // below has nothing real to match against and YouTube's player
          // rejects it the same way a bare embed URL does.
          source={{ html: buildEmbedHtml(videoId), baseUrl: 'https://ghanatalksradio.com' }}
          originWhitelist={['*']}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          domStorageEnabled
          onMessage={handleMessage}
          style={styles.webview}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#fff' },
  webview: { flex: 1, backgroundColor: '#000' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  fallbackText: { color: '#fff', fontSize: 15, textAlign: 'center' },
  fallbackButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  fallbackButtonText: { color: COLORS.onSecondary, fontWeight: '700', fontSize: 14 },
});
