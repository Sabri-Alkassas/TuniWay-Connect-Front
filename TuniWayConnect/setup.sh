
set -e

echo "Creating folders..."
mkdir -p src/api
mkdir -p src/store
mkdir -p src/navigation
mkdir -p src/screens/auth
mkdir -p src/screens/user
mkdir -p src/screens/driver
mkdir -p src/screens/admin
mkdir -p src/components
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/theme

echo "Writing types..."

cat > src/types/user.ts << 'EOF'
export type Role = 'user' | 'driver' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string | null;
  dateOfBirth: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
EOF

cat > src/types/ticket.ts << 'EOF'
export type TicketStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface Ticket {
  id: string;
  userId: string;
  stationFromId: string;
  stationFromName: string;
  stationToId: string;
  stationToName: string;
  price: number;
  status: TicketStatus;
  qrCode: string;
  purchasedAt: string;
  expiresAt: string;
  usedAt?: string | null;
}

export interface BuyTicketPayload {
  stationFromId: string;
  stationToId: string;
}
EOF

cat > src/types/station.ts << 'EOF'
export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lines: string[];
  distanceMeters?: number;
}

export interface NearbyStationsPayload {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}
EOF

echo "Writing theme..."

cat > src/theme/colors.ts << 'EOF'
export const colors = {
  navy: '#0f2354',
  navyLight: '#1a3470',
  amber: '#f5a623',
  amberDark: '#d4891a',
  red: '#e8380a',
  redDark: '#c42e06',
  white: '#ffffff',
  offWhite: '#f7f8fc',
  gray100: '#e8eaf0',
  gray300: '#b0b5c8',
  gray500: '#6b7280',
  gray700: '#374151',
  black: '#0a0a0a',
  success: '#1d9e75',
  danger: '#e8380a',
  warning: '#f5a623',
} as const;
EOF

echo "Writing stores..."

cat > src/store/authStore.ts << 'EOF'
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Role } from '../types/user';

const TOKEN_KEY = 'tuniway_token';

interface AuthState {
  token: string | null;
  user: User | null;
  role: Role | null;
  isHydrated: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  role: null,
  isHydrated: false,

  setAuth: async (token, user) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    set({ token, user, role: user.role });
  },

  clearAuth: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, role: null });
  },

  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) set({ token });
    } catch {
      // AsyncStorage failure — start unauthenticated
    } finally {
      set({ isHydrated: true });
    }
  },
}));
EOF

cat > src/store/ticketStore.ts << 'EOF'
import { create } from 'zustand';
import type { Ticket } from '../types/ticket';

interface TicketState {
  tickets: Ticket[];
  activeTicket: Ticket | null;
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  setActiveTicket: (ticket: Ticket | null) => void;
  clearTickets: () => void;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  activeTicket: null,

  setTickets: (tickets) => {
    const active = tickets.find((t) => t.status === 'active') ?? null;
    set({ tickets, activeTicket: active });
  },

  addTicket: (ticket) => {
    const updated = [ticket, ...get().tickets];
    const active = updated.find((t) => t.status === 'active') ?? null;
    set({ tickets: updated, activeTicket: active });
  },

  setActiveTicket: (ticket) => set({ activeTicket: ticket }),
  clearTickets: () => set({ tickets: [], activeTicket: null }),
}));
EOF

cat > src/store/locationStore.ts << 'EOF'
import { create } from 'zustand';
import type { Station } from '../types/station';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  permissionStatus: PermissionStatus;
  nearbyStations: Station[];
  isLoadingStations: boolean;
  setCoords: (latitude: number, longitude: number) => void;
  setPermissionStatus: (status: PermissionStatus) => void;
  setNearbyStations: (stations: Station[]) => void;
  setLoadingStations: (loading: boolean) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  permissionStatus: 'undetermined',
  nearbyStations: [],
  isLoadingStations: false,

  setCoords: (latitude, longitude) => set({ latitude, longitude }),
  setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
  setNearbyStations: (nearbyStations) => set({ nearbyStations }),
  setLoadingStations: (isLoadingStations) => set({ isLoadingStations }),
  clearLocation: () =>
    set({ latitude: null, longitude: null, nearbyStations: [], permissionStatus: 'undetermined' }),
}));
EOF

echo "Writing API layer..."

cat > src/api/client.ts << 'EOF'
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useTicketStore } from '../store/ticketStore';
import { useLocationStore } from '../store/locationStore';

const BASE_URL = process.env.API_URL ?? 'http://10.0.2.2:8080/api';

export const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().clearAuth();
      useTicketStore.getState().clearTickets();
      useLocationStore.getState().clearLocation();
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  message: string;
  status: number;
}

export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message ?? error.message,
      status: error.response?.status ?? 0,
    };
  }
  return { message: 'An unexpected error occurred', status: 0 };
}
EOF

cat > src/api/auth.ts << 'EOF'
import { client } from './client';
import type { AuthResponse } from '../types/user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
  phone?: string | null;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    client.post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    client.post<AuthResponse>('/auth/register', payload),
};
EOF

cat > src/api/tickets.ts << 'EOF'
import { client } from './client';
import type { Ticket, BuyTicketPayload } from '../types/ticket';

export const ticketsApi = {
  buy: (payload: BuyTicketPayload) =>
    client.post<Ticket>('/tickets/buy', payload),

  getMyTickets: () =>
    client.get<Ticket[]>('/tickets/my'),

  getById: (ticketId: string) =>
    client.get<Ticket>(`/tickets/${ticketId}`),

  validate: (qrCode: string) =>
    client.post<Ticket>('/tickets/validate', { qrCode }),
};
EOF

cat > src/api/stations.ts << 'EOF'
import { client } from './client';
import type { Station, NearbyStationsPayload } from '../types/station';

export const stationsApi = {
  getNearby: (payload: NearbyStationsPayload) =>
    client.post<Station[]>('/stations/nearby', payload),

  getById: (stationId: string) =>
    client.get<Station>(`/stations/${stationId}`),
};
EOF

cat > src/api/admin.ts << 'EOF'
import { client } from './client';
import type { User } from '../types/user';
import type { Ticket } from '../types/ticket';

export const adminApi = {
  getAllUsers: () =>
    client.get<User[]>('/admin/users'),

  getUserById: (userId: string) =>
    client.get<User>(`/admin/users/${userId}`),

  revokeTicket: (ticketId: string) =>
    client.post<Ticket>(`/admin/tickets/${ticketId}/revoke`),

  validateTicket: (qrCode: string) =>
    client.post<Ticket>('/admin/tickets/validate', { qrCode }),
};
EOF

echo "Writing navigation..."

cat > src/navigation/types.ts << 'EOF'
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type UserTabParamList = {
  Home: undefined;
  Map: undefined;
  Tickets: undefined;
  Profile: undefined;
};

export type BuyStackParamList = {
  BuyTicket: { stationId: string; stationName: string };
  Confirm: { ticketId: string };
};

export type DriverTabParamList = {
  DriverHome: undefined;
  Scan: undefined;
  DriverProfile: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Users: undefined;
  Stations: undefined;
  AdminScan: undefined;
};
EOF

cat > src/navigation/RootNavigator.tsx << 'EOF'
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
EOF

cat > src/navigation/AuthNavigator.tsx << 'EOF'
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
EOF

cat > src/navigation/UserNavigator.tsx << 'EOF'
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { UserTabParamList } from './types';
import { HomeScreen } from '../screens/user/HomeScreen';
import { MapScreen } from '../screens/user/MapScreen';
import { MyTicketsScreen } from '../screens/user/MyTicketsScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<UserTabParamList>();

export function UserNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.navy },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.gray300,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Tickets" component={MyTicketsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
EOF

cat > src/navigation/DriverNavigator.tsx << 'EOF'
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
EOF

cat > src/navigation/AdminNavigator.tsx << 'EOF'
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
EOF

echo "Writing placeholder screens..."

for screen in LoginScreen RegisterScreen; do
  cat > src/screens/auth/${screen}.tsx << EOF
import React from 'react';
import { View, Text } from 'react-native';
export function ${screen}() {
  return <View style={{ flex: 1 }}><Text>${screen}</Text></View>;
}
EOF
done

for screen in HomeScreen MapScreen BuyTicketScreen ConfirmScreen MyTicketsScreen ProfileScreen; do
  cat > src/screens/user/${screen}.tsx << EOF
import React from 'react';
import { View, Text } from 'react-native';
export function ${screen}() {
  return <View style={{ flex: 1 }}><Text>${screen}</Text></View>;
}
EOF
done

for screen in DriverHomeScreen ScanScreen DriverProfileScreen; do
  cat > src/screens/driver/${screen}.tsx << EOF
import React from 'react';
import { View, Text } from 'react-native';
export function ${screen}() {
  return <View style={{ flex: 1 }}><Text>${screen}</Text></View>;
}
EOF
done

for screen in DashboardScreen UsersScreen StationsScreen AdminScanScreen; do
  cat > src/screens/admin/${screen}.tsx << EOF
import React from 'react';
import { View, Text } from 'react-native';
export function ${screen}() {
  return <View style={{ flex: 1 }}><Text>${screen}</Text></View>;
}
EOF
done

echo "Writing placeholder components..."

for comp in StationCard TicketCard BusPin QRDisplay QRScanner LoadingOverlay; do
  cat > src/components/${comp}.tsx << EOF
import React from 'react';
import { View } from 'react-native';
export function ${comp}() {
  return <View />;
}
EOF
done

echo "Writing hooks..."

cat > src/hooks/useLocation.ts << 'EOF'
import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useLocationStore } from '../store/locationStore';

export function useLocation() {
  const { setCoords, setPermissionStatus } = useLocationStore();

  useEffect(() => {
    let watchId: number;

    const start = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('denied');
          return;
        }
      }
      setPermissionStatus('granted');
      watchId = Geolocation.watchPosition(
        (pos) => setCoords(pos.coords.latitude, pos.coords.longitude),
        () => setPermissionStatus('denied'),
        { enableHighAccuracy: true, distanceFilter: 20 },
      );
    };

    start();
    return () => {
      if (watchId !== undefined) Geolocation.clearWatch(watchId);
    };
  }, []);
}
EOF

cat > src/hooks/useNearbyStations.ts << 'EOF'
import { useEffect } from 'react';
import { stationsApi } from '../api/stations';
import { useLocationStore } from '../store/locationStore';

export function useNearbyStations() {
  const { latitude, longitude, setNearbyStations, setLoadingStations } = useLocationStore();

  useEffect(() => {
    if (latitude === null || longitude === null) return;

    let cancelled = false;
    const fetch = async () => {
      setLoadingStations(true);
      try {
        const res = await stationsApi.getNearby({ latitude, longitude, radiusMeters: 1000 });
        if (!cancelled) setNearbyStations(res.data);
      } catch {
        // silently fail — map shows last known stations
      } finally {
        if (!cancelled) setLoadingStations(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [latitude, longitude]);
}
EOF

cat > src/hooks/useAuthGuard.ts << 'EOF'
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types/user';

export function useAuthGuard(requiredRole: Role) {
  const { role } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    if (role !== requiredRole) {
      navigation.goBack();
    }
  }, [role, requiredRole]);
}
EOF

echo "Writing App.tsx..."

cat > App.tsx << 'EOF'
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
EOF

echo ""
echo "✓ TuniWay src scaffold complete"
echo ""
find src -type f | sort
