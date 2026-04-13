import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEntry<T> = {
  value:     T;
  expiresAt: number;
};

const keyOf = (key: string) => `api_cache:${key}`;

/** Returns fresh (non-expired) cached value or null */
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(keyOf(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      // Fire-and-forget eviction — don't block caller
      AsyncStorage.removeItem(keyOf(key)).catch(() => {});
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
};

/** Stores value with TTL */
export const setCache = async <T>(key: string, value: T, ttlMs: number): Promise<void> => {
  try {
    const payload: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs };
    await AsyncStorage.setItem(keyOf(key), JSON.stringify(payload));
  } catch {
    // Non-critical — silent fail
  }
};

/** Returns last stored value regardless of TTL (used as offline fallback) */
export const getStaleCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(keyOf(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    return parsed?.value ?? null;
  } catch {
    return null;
  }
};

/** Invalidates a specific cache key */
export const invalidateCache = async (key: string): Promise<void> => {
  await AsyncStorage.removeItem(keyOf(key)).catch(() => {});
};

/** Clears all api_cache:* entries */
export const clearAllCache = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith('api_cache:'));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch { /* non-critical */ }
};
