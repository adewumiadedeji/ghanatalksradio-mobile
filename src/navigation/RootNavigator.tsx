import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View, ActivityIndicator } from 'react-native';

import { useUserStore } from '../store/userStore';
import { useRadioStore } from '../store/radioStore';
import { COLORS } from '../theme/colors';
import { MiniPlayer } from '../components/MiniPlayer';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import NewsScreen from '../screens/NewsScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import RaffleScreen from '../screens/RaffleScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PodcastStackNavigator from './PodcastStackNavigator';
import NowPlayingScreen from '../screens/NowPlayingScreen';

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  News: 'newspaper',
  Discover: 'compass',
  Podcast: 'radio',
  Raffles: 'pricetag',
  Profile: 'person',
};

function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.secondary,
          tabBarInactiveTintColor: COLORS.onSurfaceVariant,
          tabBarStyle: { backgroundColor: COLORS.surfaceContainer, borderTopColor: COLORS.outlineVariant },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="News" component={NewsScreen} />
        <Tab.Screen name="Discover" component={DiscoverScreen} />
        <Tab.Screen name="Podcast" component={PodcastStackNavigator} />
        <Tab.Screen name="Raffles" component={RaffleScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
      {/* Persistent mini-player sits above the tab bar */}
      <MiniPlayer />
    </View>
  );
}

// Presented as a modal from anywhere (Profile tab, Raffles gate, or a voluntary
// "Sign In" prompt on News) rather than gating app entry the way the original
// Stitch prototype did.
function AuthNavigator({ route }: any) {
  const initialRoute = route?.params?.screen ?? 'Login';
  return (
    <AuthStack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const hasHydrated = useUserStore((s) => s.hasHydrated);
  const initReconnectWatcher = useRadioStore((s) => s.initReconnectWatcher);

  useEffect(() => {
    initReconnectWatcher();
  }, [initReconnectWatcher]);

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {/* Guests land here directly - News/Discover/Listen are open, Raffles/Profile gate individually */}
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen
          name="NowPlaying"
          component={NowPlayingScreen}
          options={{ presentation: 'modal' }}
        />
        <RootStack.Screen
          name="AuthModal"
          component={AuthNavigator}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
