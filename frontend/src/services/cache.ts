import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const keyOf = (key: string) => `api_cache:${key}`;

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(keyOf(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      await AsyncStorage.removeItem(keyOf(key));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
};

export const setCache = async <T>(key: string, value: T, ttlMs: number) => {
  try {
    const payload: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs };
    await AsyncStorage.setItem(keyOf(key), JSON.stringify(payload));
  } catch {
    // Non-critical path: ignore cache write failures.
  }
};
