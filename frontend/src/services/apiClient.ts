import { createApi } from './api';

/** Production API. Telefon buildida lokal URL ishlatilmasin. */
const FALLBACK_PRODUCTION = 'https://web-production-cabff.up.railway.app';

function isLikelyLanOrLocalhost(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '0.0.0.0') return true;
    if (host.startsWith('127.')) return true;
    const parts = host.split('.').map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 192 && b === 168) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function getEnvBackendUrl(): string | undefined {
  // Try multiple sources for the backend URL
  // 1. process.env (for Metro bundler) - primary source for React Native
  try {
    const envVar = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_BACKEND_URL : undefined;
    const env1 = typeof envVar === 'string' ? envVar.trim() : undefined;
    if (env1) return env1;
  } catch { /* ignore */ }

  // 2. global __ENV__ (for some web builds)
  try {
    const globalEnv = (typeof global !== 'undefined' && (global as any).__ENV__?.EXPO_PUBLIC_BACKEND_URL);
    const env2 = typeof globalEnv === 'string' ? globalEnv.trim() : undefined;
    if (env2) return env2;
  } catch { /* ignore */ }

  // Note: import.meta.env is not used because it's not supported in Hermes (Android)
  // The fallback URL will be used if no env var is found

  return undefined;
}

function resolveBackendUrl(): string {
  const raw = getEnvBackendUrl();

  // HARDcoded production URL for APK builds
  // process.env is unreliable in production builds, so always use fallback for production
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    console.log('[API] Production mode, using hardcoded fallback:', FALLBACK_PRODUCTION);
    return FALLBACK_PRODUCTION;
  }

  // Development mode - try env var first
  if (raw) {
    console.log('[API] Development mode, using:', raw);
    return raw;
  }

  // Development fallback
  console.log('[API] Development: No env var, using fallback:', FALLBACK_PRODUCTION);
  return FALLBACK_PRODUCTION;
}

export const backendUrl = resolveBackendUrl();
export const api = createApi(backendUrl);

let warmupPromise: Promise<void> | null = null;

export const warmBackend = async (): Promise<void> => {
  if (warmupPromise) return warmupPromise;

  warmupPromise = fetch(`${backendUrl}/api/health`)
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      warmupPromise = null;
    });

  return warmupPromise;
};
