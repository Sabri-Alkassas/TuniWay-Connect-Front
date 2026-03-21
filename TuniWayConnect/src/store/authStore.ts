import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/user';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => {
    AsyncStorage.setItem('token', token);
    set({ token, user });
  },
  clearAuth: () => {
    AsyncStorage.removeItem('token');
    set({ token: null, user: null });
  },
}));