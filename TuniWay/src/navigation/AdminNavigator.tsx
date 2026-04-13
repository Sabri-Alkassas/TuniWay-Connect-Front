import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AdminTabParamLista } from './types';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminStaffScreen } from '../screens/admin/Adminstaffscreen';
import { AdminTransportsScreen } from '../screens/admin/Admintransportsscreen';
import { AdminPlanningScreen } from '../screens/admin/Adminplanningscreen';
import { AdminProfileScreen } from '../screens/admin/Adminprofilescreen';
import { colors } from '../theme/colors';
import { AppIcon } from '../components/AppIcon';

const Tab = createBottomTabNavigator<AdminTabParamLista>();

interface TabIconProps {
  family: React.ComponentProps<typeof AppIcon>['family'];
  name: string;
  focused: boolean;
}

function TabIcon({ family, name, focused }: TabIconProps) {
  return (
    <View style={[styles.navIc, focused && styles.navIcOn]}>
      <AppIcon
        family={family as never}
        name={name as never}
        size={16}
        color={focused ? colors.navy : 'rgba(255,255,255,0.7)'}
      />
    </View>
  );
}

export function AdminNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: Math.max(insets.bottom, 12) }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Tableau',
          tabBarIcon: ({ focused }) => <TabIcon family="MaterialCommunityIcons" name="view-dashboard-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AdminStaff"
        component={AdminStaffScreen}
        options={{
          tabBarLabel: 'Équipe',
          tabBarIcon: ({ focused }) => <TabIcon family="Feather" name="users" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AdminTransports"
        component={AdminTransportsScreen}
        options={{
          tabBarLabel: 'Transports',
          tabBarIcon: ({ focused }) => <TabIcon family="MaterialCommunityIcons" name="bus-multiple" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AdminPlanning"
        component={AdminPlanningScreen}
        options={{
          tabBarLabel: 'Planning',
          tabBarIcon: ({ focused }) => <TabIcon family="MaterialCommunityIcons" name="calendar-clock-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon family="Feather" name="user" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.navy,
    borderTopWidth: 0,
    paddingTop: 9,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  navIc: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcOn: {
    backgroundColor: colors.amber,
  },
});
