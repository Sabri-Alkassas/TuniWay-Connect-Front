import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import type { AdminTabParamLista } from './types';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminStaffScreen }      from '../screens/admin/Adminstaffscreen';
import { AdminTransportsScreen } from '../screens/admin/Admintransportsscreen';
import { AdminPlanningScreen }   from '../screens/admin/Adminplanningscreen';
import { AdminProfileScreen }    from '../screens/admin/Adminprofilescreen';
import { colors }               from '../theme/colors';

const Tab = createBottomTabNavigator<AdminTabParamLista>();

interface TabIconProps {
  emoji: string;
  focused: boolean;
}

function TabIcon({ emoji, focused }: TabIconProps) {
  return (
    <View style={[styles.navIc, focused && styles.navIcOn]}>
      <Text style={styles.navEmoji}>{emoji}</Text>
    </View>
  );
}


export function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor:   colors.amber,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⊞" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AdminStaff"
        component={AdminStaffScreen}
        options={{
          tabBarLabel: 'Staff',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AdminTransports"
        component={AdminTransportsScreen}
        options={{
          tabBarLabel: 'Transports',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🚌" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AdminPlanning"
        component={AdminPlanningScreen}
        options={{
          tabBarLabel: 'Planning',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.navy,
    borderTopWidth:  0,
    paddingTop:      9,
    paddingBottom:   13,
    height:          70,
  },
  tabLabel: {
    fontSize:   10,
    fontWeight: '700',
    marginTop:  2,
  },
  navIc: {
    width:           28,
    height:          28,
    borderRadius:    9,
    alignItems:      'center',
    justifyContent:  'center',
  },
  navIcOn: {
    backgroundColor: colors.amber,
  },
  navEmoji: {
    fontSize: 13,
  },
});
