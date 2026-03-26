import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { RootTabParamList } from './types';
import HomeScreen      from '../screens/HomeScreen';
import MapScreen       from '../screens/MapScreen';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import ProfileScreen   from '../screens/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.navy },
          tabBarActiveTintColor: colors.amber,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        }}
      >
        <Tab.Screen name="Home"    component={HomeScreen} />
        <Tab.Screen name="Map"     component={MapScreen} />
        <Tab.Screen name="Tickets" component={MyTicketsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}