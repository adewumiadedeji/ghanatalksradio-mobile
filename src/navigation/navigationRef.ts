import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Lets code outside the React tree (push-notification tap handlers,
 * which can fire before RootNavigator has even mounted - see
 * messaging().getInitialNotification()) navigate without needing a
 * navigation prop. Attached to <NavigationContainer ref={navigationRef}>
 * in RootNavigator.tsx.
 */
export const navigationRef = createNavigationContainerRef();

export function navigateWhenReady(name: string, params?: object) {
  if (navigationRef.isReady()) {
    // @ts-expect-error - generic navigate() signature, screen names are
    // plain strings here rather than the app's full param-list union.
    navigationRef.navigate(name, params);
  } else {
    // RootNavigator hasn't mounted yet (e.g. a notification launched the
    // app from a killed state) - wait for it rather than dropping the tap.
    const timer = setInterval(() => {
      if (navigationRef.isReady()) {
        clearInterval(timer);
        // @ts-expect-error - see above.
        navigationRef.navigate(name, params);
      }
    }, 100);
    setTimeout(() => clearInterval(timer), 10000);
  }
}
