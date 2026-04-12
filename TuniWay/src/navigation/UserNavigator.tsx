import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';

import type { UserTabParamList, UserStackParamList } from './types';
import { HomeScreen }            from '../screens/user/HomeScreen';
import { SearchScreen }          from '../screens/user/SearchScreen';
import { MapScreen }             from '../screens/user/MapScreen';
import { MyTicketsScreen }       from '../screens/user/MyTicketsScreen';
import { ProfileScreen }         from '../screens/user/ProfileScreen';
import { TransportDetailScreen } from '../screens/user/TransportDetailScreen';
import { BuyTicketScreen }       from '../screens/user/BuyTicketScreen';
import { TicketConfirmScreen }   from '../screens/user/TicketConfirmScreen';
import { EditProfileScreen }     from '../screens/user/EditProfileScreen';
import { colors }                from '../theme/colors';

const Tab   = createBottomTabNavigator<UserTabParamList>();
const Stack = createNativeStackNavigator<UserStackParamList>();

interface TabIconProps { emoji: string; focused: boolean; }

function TabIcon({ emoji, focused }: TabIconProps) {
  return (
    <View style={[styles.navIc, focused && styles.navIcOn]}>
      <Text style={styles.navEmoji}>{emoji}</Text>
    </View>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:             false,
        tabBarStyle:             styles.tabBar,
        tabBarLabelStyle:        styles.tabLabel,
        tabBarActiveTintColor:   colors.amber,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⌂" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⊙" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon emoji="◎" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Tickets"
        component={MyTicketsScreen}
        options={{
          tabBarLabel: 'Tickets',
          tabBarIcon: ({ focused }) => <TabIcon emoji="▣" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="◉" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function UserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserTabs"        component={UserTabs} />
      <Stack.Screen name="TransportDetail" component={TransportDetailScreen} />
      <Stack.Screen name="BuyTicket"       component={BuyTicketScreen} />
      <Stack.Screen name="TicketConfirm"   component={TicketConfirmScreen} />
      <Stack.Screen name="EditProfile"     component={EditProfileScreen} />
    </Stack.Navigator>
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