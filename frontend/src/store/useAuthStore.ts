import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_EXPIRES_AT_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_USER_KEY,
  type AuthUser,
} from '../modules/auth/contracts';
import { clearAllCache } from '../services/cache';

export type User = AuthUser;

type SessionSnapshot = {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
};

type AuthState = SessionSnapshot & {
  isLoading: boolean;
  isHydrated: boolean;
  setSession: (session: SessionSnapshot) => Promise<void>;
  setUser: (
    user: User | null,
    token: string | null,
    refreshToken?: string | null,
    accessTokenExpiresAt?: string | null,
  ) => Promise<void>;
  clearSession: () => Promise<void>;
  initialize: () => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
};

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

const emptySession = (): SessionSnapshot => ({
  user: null,
  token: null,
  refreshToken: null,
  accessTokenExpiresAt: null,
});

const persistSessionSnapshot = async ({ user, token, refreshToken, accessTokenExpiresAt }: SessionSnapshot) => {
  if (!user || !token || !refreshToken || !accessTokenExpiresAt) {
    await withTimeout(
      AsyncStorage.multiRemove([
        AUTH_ACCESS_TOKEN_KEY,
        AUTH_REFRESH_TOKEN_KEY,
        AUTH_USER_KEY,
        AUTH_EXPIRES_AT_KEY,
      ]),
      undefined,
    );
    return;
  }

  await withTimeout(
    AsyncStorage.multiSet([
      [AUTH_ACCESS_TOKEN_KEY, token],
      [AUTH_REFRESH_TOKEN_KEY, refreshToken],
      [AUTH_USER_KEY, JSON.stringify(user)],
      [AUTH_EXPIRES_AT_KEY, accessTokenExpiresAt],
    ]),
    undefined,
  );
};

const getPersistedSessionSnapshot = async (): Promise<SessionSnapshot | null> => {
  try {
    const entries = await withTimeout(
      AsyncStorage.multiGet([
        AUTH_ACCESS_TOKEN_KEY,
        AUTH_REFRESH_TOKEN_KEY,
        AUTH_USER_KEY,
        AUTH_EXPIRES_AT_KEY,
      ]),
      [
        [AUTH_ACCESS_TOKEN_KEY, null],
        [AUTH_REFRESH_TOKEN_KEY, null],
        [AUTH_USER_KEY, null],
        [AUTH_EXPIRES_AT_KEY, null],
      ] as [string, string | null][],
    );

    const [[, storedToken], [, storedRefreshToken], [, storedUser], [, storedExpiresAt]] = entries;

    if (!storedToken || !storedRefreshToken || !storedUser || !storedExpiresAt) {
      return null;
    }

    return {
      token: storedToken,
      refreshToken: storedRefreshToken,
      accessTokenExpiresAt: storedExpiresAt,
      user: JSON.parse(storedUser) as User,
    };
  } catch {
    return null;
  }
};

const clearPersistedSession = async () => {
  await clearAllCache().catch(() => {});
  await AsyncStorage.multiRemove([
    AUTH_ACCESS_TOKEN_KEY,
    AUTH_REFRESH_TOKEN_KEY,
    AUTH_USER_KEY,
    AUTH_EXPIRES_AT_KEY,
    'auth-storage',
  ]).catch(() => {});
};

export const useAuthStore = create<AuthState>((set) => ({
  ...emptySession(),
  isLoading: true,
  isHydrated: false,

  setSession: async (session) => {
    await persistSessionSnapshot(session).catch(() => {});
    set({
      ...session,
      isLoading: false,
      isHydrated: true,
    });
  },

  setUser: async (user, token, refreshToken = null, accessTokenExpiresAt = null) => {
    await useAuthStore.getState().setSession({
      user,
      token,
      refreshToken,
      accessTokenExpiresAt,
    });
  },

  clearSession: async () => {
    await clearPersistedSession();
    set({
      ...emptySession(),
      isLoading: false,
      isHydrated: true,
    });
  },

  initialize: async () => {
    set({ isLoading: true });

    const persistedSnapshot = await getPersistedSessionSnapshot();
    if (persistedSnapshot) {
      set({
        ...persistedSnapshot,
        isLoading: false,
        isHydrated: true,
      });
      return;
    }

    set({
      ...emptySession(),
      isLoading: false,
      isHydrated: true,
    });
  },

  checkSession: async () => {
    const persistedSnapshot = await getPersistedSessionSnapshot();
    if (persistedSnapshot) {
      set({
        ...persistedSnapshot,
        isLoading: false,
        isHydrated: true,
      });
      return;
    }

    set({
      ...emptySession(),
      isLoading: false,
      isHydrated: true,
    });
  },

  logout: async () => {
    await clearPersistedSession();
    set({
      ...emptySession(),
      isLoading: false,
      isHydrated: true,
    });
  },
}));
