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
      // fail silently
    } finally {
      set({ isHydrated: true });
    }
  },
}));
