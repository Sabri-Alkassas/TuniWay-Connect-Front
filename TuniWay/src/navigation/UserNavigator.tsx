import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { UserTabParamList } from './types';
import { HomeScreen } from '../screens/user/HomeScreen';
import { MapScreen } from '../screens/user/MapScreen';
import { MyTicketsScreen } from '../screens/user/MyTicketsScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<UserTabParamList>();

export function UserNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.navy },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.gray300,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Tickets" component={MyTicketsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
