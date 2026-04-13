import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DriverTabParamList } from './types';
import { DriverHomeScreen } from '../screens/driver/DriverHomeScreen';
import { ScanScreen } from '../screens/driver/ScanScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<DriverTabParamList>();

export function DriverNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.navy,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 12),
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'Accueil' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan' }} />
      <Tab.Screen name="DriverProfile" component={DriverProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
