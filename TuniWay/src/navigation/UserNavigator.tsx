import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { UserTabParamList, UserStackParamList } from './types';
import { HomeScreen } from '../screens/user/HomeScreen';
import { SearchScreen } from '../screens/user/SearchScreen';
import { MapScreen } from '../screens/user/MapScreen';
import { MyTicketsScreen } from '../screens/user/MyTicketsScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { TransportDetailScreen } from '../screens/user/TransportDetailScreen';
import { BuyTicketScreen } from '../screens/user/BuyTicketScreen';
import { TicketConfirmScreen } from '../screens/user/TicketConfirmScreen';
import { EditProfileScreen } from '../screens/user/EditProfileScreen';
import { colors } from '../theme/colors';
import { AppIcon } from '../components/AppIcon';

const Tab = createBottomTabNavigator<UserTabParamList>();
const Stack = createNativeStackNavigator<UserStackParamList>();

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

function UserTabs() {
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon family="Feather" name="home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Recherche',
          tabBarIcon: ({ focused }) => <TabIcon family="Feather" name="search" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Carte',
          tabBarIcon: ({ focused }) => <TabIcon family="Feather" name="map-pin" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Tickets"
        component={MyTicketsScreen}
        options={{
          tabBarLabel: 'Billets',
          tabBarIcon: ({ focused }) => <TabIcon family="MaterialCommunityIcons" name="ticket-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon family="Feather" name="user" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function UserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserTabs" component={UserTabs} />
      <Stack.Screen name="TransportDetail" component={TransportDetailScreen} />
      <Stack.Screen name="BuyTicket" component={BuyTicketScreen} />
      <Stack.Screen name="TicketConfirm" component={TicketConfirmScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
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
