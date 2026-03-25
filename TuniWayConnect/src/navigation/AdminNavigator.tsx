import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { AdminTabParamList } from './types';
import { DashboardScreen } from '../screens/admin/DashboardScreen';
import { UsersScreen } from '../screens/admin/UsersScreen';
import { StationsScreen } from '../screens/admin/StationsScreen';
import { AdminScanScreen } from '../screens/admin/AdminScanScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.navy },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.gray300,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Stations" component={StationsScreen} />
      <Tab.Screen name="AdminScan" component={AdminScanScreen} />
    </Tab.Navigator>
  );
}
