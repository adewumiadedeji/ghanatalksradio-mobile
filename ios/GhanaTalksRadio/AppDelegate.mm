#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <Firebase.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Must run before anything touches the Firebase SDK (e.g.
  // @react-native-firebase/messaging in index.js, which runs as soon as
  // the JS bundle loads) - @react-native-firebase/app's auto-init swizzle
  // doesn't reliably win that race in every build configuration, and an
  // unconfigured default app throws "No Firebase App '[DEFAULT]' has been
  // created", which crashes JS load before AppRegistry.registerComponent
  // even runs. Explicit configure() is what Firebase's own iOS setup docs
  // recommend, and removes any dependency on swizzle timing.
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }

  self.moduleName = @"GhanaTalksRadio";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// Universal Links land here (see GhanaTalksRadio.entitlements' associated
// domains) - forwards the tapped ghanatalksradio.com URL into React
// Native's Linking module so Linking.getInitialURL()/'url' event fire,
// same as they would for a custom-scheme link.
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))restorationHandler
{
  return [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
