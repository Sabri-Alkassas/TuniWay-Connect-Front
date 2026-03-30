import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { UserNavigator } from './src/navigation/UserNavigator';
import { DriverNavigator } from './src/navigation/DriverNavigator';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import { colors } from './src/theme/colors';

export default function App() {
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
    <SafeAreaProvider>
      <NavigationContainer>
        {renderNavigator()}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
