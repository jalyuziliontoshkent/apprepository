import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

function getEnvVar(...keys: string[]): string | undefined {
  for (const key of keys) {
    try {
      const val = (typeof process !== 'undefined' && process.env?.[key]) ??
                  (typeof global !== 'undefined' && (global as any).__ENV__?.[key]);
      if (typeof val === 'string' && val.trim()) return val.trim();
    } catch { /* ignore */ }
  }
  return undefined;
}

function getExtraValue(key: 'supabaseUrl' | 'supabaseAnonKey'): string | undefined {
  try {
    const extraValue =
      Constants.expoConfig?.extra?.[key] ??
      Constants.manifest2?.extra?.expoClient?.extra?.[key];
    return typeof extraValue === 'string' && extraValue.trim() ? extraValue.trim() : undefined;
  } catch {
    return undefined;
  }
}

const supabaseUrl =
  getEnvVar('EXPO_PUBLIC_SUPABASE_URL') ??
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ??
  getEnvVar('REACT_APP_SUPABASE_URL') ??
  getExtraValue('supabaseUrl');

const supabaseAnonKey =
  getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY') ??
  getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ??
  getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') ??
  getEnvVar('REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY') ??
  getExtraValue('supabaseAnonKey');

// Create a dummy client if env vars are missing - app won't crash but Supabase features won't work
let supabase: ReturnType<typeof createClient>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Env vars missing - creating dummy client. Some features may not work.');
  // Create a dummy client that will fail gracefully
  supabase = createClient('https://dummy.supabase.co', 'dummy-key', {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export { supabase };
