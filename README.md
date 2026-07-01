# GhanaTalksRadio — React Native CLI App

Bare React Native CLI project (no Expo). Same screens, stores, and API wiring
as the earlier Expo build, ported to plain RN 0.74.5 + React 18.

## Setup

```bash
npm install

# iOS only
cd ios && pod install && cd ..
```

```bash
npx react-native run-android
npx react-native run-ios
```

## What's different from the Expo version

- `@expo/vector-icons` → `react-native-vector-icons` (Ionicons font linked via
  `android/app/build.gradle` -> `fonts.gradle`, and `Info.plist` -> `UIAppFonts`).
- `expo-status-bar` → React Native's built-in `StatusBar`.
- No `app.json` Expo config / no `expo prebuild` — `android/` and `ios/` are real,
  permanent native projects generated directly by `@react-native-community/cli init`,
  not regenerated on each build.
- Added `SafeAreaProvider` wrapper in `App.tsx` (Expo's template included this
  implicitly; bare RN needs it explicit for `react-native-safe-area-context` to work).
- Added `index.js` registration of `react-native-track-player`'s headless playback
  service (`src/services/playbackService.ts`) — required for background/lock-screen
  audio controls, and for remote play/pause/stop events to reach the player when
  the app isn't in the foreground.
- `AndroidManifest.xml`: added `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`,
  and `WAKE_LOCK` permissions, plus the `MusicService` and `MediaButtonReceiver`
  entries `react-native-track-player` needs for background playback and lock-screen
  controls (mirrors the Firestick app's foreground-service approach).
- `Info.plist`: added `UIBackgroundModes: audio` for the same reason on iOS.

## Wiring to real data

Same as before — see `src/services/api.ts` for the real WordPress, podcast, and
live-stream endpoints, and `src/store/contentStore.ts` for where to swap mock
data for live `fetchPosts()` calls.

## Open items / decisions still needed

1. **Auth backend** — Login/SignUp are still mocked (`setTimeout`); no real auth
   endpoint was established in prior sessions.
2. **App icons** — template defaults are in place; swap
   `android/app/src/main/res/mipmap-*` and `ios/GhanaTalksRadio/Images.xcassets`
   for real branding.
3. **Raffle/points integrity** — still local-only via AsyncStorage; needs a
   server-authoritative backend for production use.
4. **iOS build** — only verified via `pod install`/static checks in this sandbox
   (no macOS/Xcode available here); first real build may surface minor Podfile
   tweaks, which is normal for a fresh bare RN + native module project.
