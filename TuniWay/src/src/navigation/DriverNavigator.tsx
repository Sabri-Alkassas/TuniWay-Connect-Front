import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DriverTabParamList } from './types';
import { DriverHomeScreen } from '../screens/driver/DriverHomeScreen';
import { ScanScreen } from '../screens/driver/ScanScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';
import { colors } from '../theme/colors';
import { AppIcon } from '../components/AppIcon';

const Tab = createBottomTabNavigator<DriverTabParamList>();

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

export function DriverNavigator() {
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
        name="DriverHome"
        component={DriverHomeScreen}
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon family="MaterialCommunityIcons" name="steering" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => <TabIcon family="Feather" name="camera" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="DriverProfile"
        component={DriverProfileScreen}
        options={{
          title: 'Profil',
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
