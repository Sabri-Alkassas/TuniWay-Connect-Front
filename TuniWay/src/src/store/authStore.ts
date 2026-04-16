import { create } from 'zustand';
import { safeGetItem, safeRemoveItem, safeSetItem } from '../lib/safeStorage';
import type { User, Role } from '../types/user';

const TOKEN_KEY = 'tuniway_token';
const USER_KEY = 'tuniway_user';

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
    await safeSetItem(TOKEN_KEY, token);
    await safeSetItem(USER_KEY, JSON.stringify(user));
    set({ token, user, role: user.role });
  },

  clearAuth: async () => {
    await safeRemoveItem(TOKEN_KEY);
    await safeRemoveItem(USER_KEY);
    set({ token: null, user: null, role: null });
  },

  hydrate: async () => {
    try {
      const [token, storedUser] = await Promise.all([
        safeGetItem(TOKEN_KEY),
        safeGetItem(USER_KEY),
      ]);

      if (token && storedUser) {
        const user = JSON.parse(storedUser) as User;
        set({ token, user, role: user.role });
      } else if (token) {
        set({ token });
      }
    } catch {
      // fail silently
    } finally {
      set({ isHydrated: true });
    }
  },
}));
