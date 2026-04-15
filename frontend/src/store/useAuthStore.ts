import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
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
const SESSION_STORAGE_TIMEOUT_MS = 1500;

const withTimeout = async <T>(operation: Promise<T>, fallback: T, timeoutMs = SESSION_STORAGE_TIMEOUT_MS) => {
  try {
    return await Promise.race<T>([
      operation,
      new Promise<T>((resolve) => {
        setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch {
    return fallback;
  }
};

const persistSessionSnapshot = async (user: User | null, token: string | null) => {
  if (!user || !token) {
    await withTimeout(AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]), undefined);
    return;
  }

  await withTimeout(
    AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, token],
      [AUTH_USER_KEY, JSON.stringify(user)],
    ]),
    undefined,
  );
};

const getPersistedSessionSnapshot = async (): Promise<{ user: User; token: string } | null> => {
  try {
    const entries = await withTimeout(
      AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_USER_KEY]),
      [
        [AUTH_TOKEN_KEY, null],
        [AUTH_USER_KEY, null],
      ] as [string, string | null][],
    );
    const [[, storedToken], [, storedUser]] = entries;

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

export const useAuthStore = create<AuthState>((set) => ({
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
}));
