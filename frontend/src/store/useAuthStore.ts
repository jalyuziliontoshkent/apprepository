import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
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

const buildUserFromSession = async (): Promise<{ user: User; token: string } | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token || !data.session.user) {
    return null;
  }

  const authUser = data.session.user;
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  const user: User = {
    id: authUser.id,
    email: authUser.email ?? '',
    role: (profile?.role ??
      authUser.app_metadata?.role ??
      authUser.user_metadata?.role ??
      'dealer') as User['role'],
    name: profile?.name ?? authUser.user_metadata?.name,
    ...(profile ?? {}),
  };

  return {
    user,
    token: data.session.access_token,
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isHydrated: false,

      setUser: async (user, token) => {
        await persistSessionSnapshot(user, token).catch(() => {});
        set({ user, token });
      },

      initialize: async () => {
        if (get().isHydrated) {
          return;
        }

        await get().checkSession();
        set({ isHydrated: true });
      },

      checkSession: async () => {
        set({ isLoading: true });

        try {
          const sessionSnapshot = await buildUserFromSession();
          if (sessionSnapshot) {
            await get().setUser(sessionSnapshot.user, sessionSnapshot.token);
          } else {
            await get().setUser(null, null);
          }
        } catch (error) {
          console.error('[AuthStore] session restore failed', error);
          await get().setUser(null, null);
        } finally {
          set({ isLoading: false, isHydrated: true });
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch (error) {
          console.warn('[AuthStore] signOut warning', error);
        }

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
