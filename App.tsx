import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';
import { NetworkStatusBanner } from './src/components/NetworkStatusBanner';
import { UpdateRequiredScreen } from './src/components/UpdateRequiredScreen';
import { UpdateAvailableModal } from './src/components/UpdateAvailableModal';
import { useAppVersionStore } from './src/store/appVersionStore';
import { initAds } from './src/services/ads/initAds';
import { initPushNotifications } from './src/services/pushNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const checkForUpdate = useAppVersionStore((s) => s.checkForUpdate);
  const versionResult = useAppVersionStore((s) => s.result);
  const softNagDismissed = useAppVersionStore((s) => s.softNagDismissed);
  const dismissSoftNag = useAppVersionStore((s) => s.dismissSoftNag);

  useEffect(() => {
    initAds();
    initPushNotifications();
    checkForUpdate();
  }, [checkForUpdate]);

  // force_update replaces the entire app - no navigator, no way around it.
  // Everything else (including the soft nag below) renders on top of the
  // normal app instead, since neither should ever block using it.
  if (versionResult?.force_update) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <UpdateRequiredScreen storeUrl={versionResult.store_url} releaseNotes={versionResult.release_notes} />
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
        <NetworkStatusBanner />
        {!!versionResult?.update_available && (
          <UpdateAvailableModal
            visible={!softNagDismissed}
            storeUrl={versionResult.store_url}
            releaseNotes={versionResult.release_notes}
            gracePeriodEndsAt={versionResult.grace_period_ends_at}
            onDismiss={dismissSoftNag}
          />
        )}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}