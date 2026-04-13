import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clearAllCache } from '../services/cache';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'worker' | 'dealer';
  name?: string;
  phone?: string;
  address?: string;
  credit_limit?: number;
  debt?: number;
  [key: string]: unknown;
}

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  setUser: (user: User | null, token: string | null) => Promise<void>;
  clearSession: () => Promise<void>;
  initialize: () => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';

const persistSessionSnapshot = async (user: User | null, token: string | null) => {
  if (!user || !token) {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
    return;
  }

  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_USER_KEY, JSON.stringify(user)],
  ]);
};

const getPersistedSessionSnapshot = async (): Promise<{ user: User; token: string } | null> => {
  try {
    const [[, storedToken], [, storedUser]] = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_USER_KEY]);

    if (!storedToken || !storedUser) {
      return null;
    }

    return {
      token: storedToken,
      user: JSON.parse(storedUser) as User,
    };
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,
      isHydrated: false,

      setUser: async (user, token) => {
        await persistSessionSnapshot(user, token).catch(() => {});
        set({
          user,
          token,
          isLoading: false,
          isHydrated: true,
        });
      },

      clearSession: async () => {
        await clearAllCache().catch(() => {});
        await AsyncStorage.multiRemove([
          AUTH_TOKEN_KEY,
          AUTH_USER_KEY,
          'auth-storage',
          'sb-local-storage',
        ]).catch(() => {});

        set({
          user: null,
          token: null,
          isLoading: false,
          isHydrated: true,
        });
      },

      initialize: async () => {
        set({ isLoading: true });

        const persistedSnapshot = await getPersistedSessionSnapshot();
        if (persistedSnapshot) {
          set({
            user: persistedSnapshot.user,
            token: persistedSnapshot.token,
            isLoading: false,
            isHydrated: true,
          });
          return;
        }

        set({
          user: null,
          token: null,
          isLoading: false,
          isHydrated: true,
        });
      },

      checkSession: async () => {
        const persistedSnapshot = await getPersistedSessionSnapshot();
        if (persistedSnapshot) {
          set({
            user: persistedSnapshot.user,
            token: persistedSnapshot.token,
            isLoading: false,
            isHydrated: true,
          });
          return;
        }

        set({
          user: null,
          token: null,
          isLoading: false,
          isHydrated: true,
        });
      },

      logout: async () => {
        await clearAllCache().catch(() => {});
        await AsyncStorage.multiRemove([
          AUTH_TOKEN_KEY,
          AUTH_USER_KEY,
          'auth-storage',
          'sb-local-storage',
        ]).catch(() => {});

        set({
          user: null,
          token: null,
          isLoading: false,
          isHydrated: true,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isHydrated: state.isHydrated,
      }),
    },
  ),
);
