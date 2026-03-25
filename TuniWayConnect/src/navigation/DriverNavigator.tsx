import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { DriverTabParamList } from './types';
import { DriverHomeScreen } from '../screens/driver/DriverHomeScreen';
import { ScanScreen } from '../screens/driver/ScanScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<DriverTabParamList>();

export function DriverNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.navy },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.gray300,
      }}
    >
      <Tab.Screen name="DriverHome" component={DriverHomeScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="DriverProfile" component={DriverProfileScreen} />
    </Tab.Navigator>
  );
}
