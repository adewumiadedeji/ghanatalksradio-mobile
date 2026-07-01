import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PodcastListScreen from '../screens/podcast/PodcastListScreen';
import PodcastAllEpisodesScreen from '../screens/podcast/PodcastAllEpisodesScreen';
import PodcastShowScreen from '../screens/podcast/PodcastShowScreen';
import PodcastEpisodeDetailScreen from '../screens/podcast/PodcastEpisodeDetailScreen';

const Stack = createNativeStackNavigator();

/**
 * Nested inside the "Podcast" bottom tab so the tab bar (and mini-player)
 * stay visible while navigating categories -> show -> episode detail,
 * matching the web version's nav-dropdown structure (category list with an
 * "All Podcast" entry alongside per-show categories) plus its
 * /podcast/:showSlug -> /podcast/:showSlug/:episodeSlug route hierarchy.
 */
export default function PodcastStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PodcastList" component={PodcastListScreen} />
      <Stack.Screen name="PodcastAllEpisodes" component={PodcastAllEpisodesScreen} />
      <Stack.Screen name="PodcastShow" component={PodcastShowScreen} />
      <Stack.Screen name="PodcastEpisodeDetail" component={PodcastEpisodeDetailScreen} />
    </Stack.Navigator>
  );
}
