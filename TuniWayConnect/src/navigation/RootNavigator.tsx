import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { UserNavigator } from './UserNavigator';
import { DriverNavigator } from './DriverNavigator';
import { AdminNavigator } from './AdminNavigator';
import { colors } from '../theme/colors';

export function RootNavigator() {
  const { token, role, isHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.navy }}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  const renderNavigator = () => {
    if (!token || !role) return <AuthNavigator />;
    if (role === 'user') return <UserNavigator />;
    if (role === 'driver') return <DriverNavigator />;
    if (role === 'admin') return <AdminNavigator />;
    return <AuthNavigator />;
  };

  return (
    <NavigationContainer>
      {renderNavigator()}
    </NavigationContainer>
  );
}
