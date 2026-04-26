import Constants from 'expo-constants';
import { createApi } from './api';

function normalizeUrl(value?: string | null): string | undefined {
  const normalized = typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
  return normalized || undefined;
}

function getEnvBackendUrl(): string | undefined {
  try {
    const envVar = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_BACKEND_URL : undefined;
    const env1 = normalizeUrl(envVar);
    if (env1) return env1;
  } catch {
    // ignore
  }

  try {
    const globalEnv = typeof global !== 'undefined' ? (global as any).__ENV__?.EXPO_PUBLIC_BACKEND_URL : undefined;
    const env2 = normalizeUrl(globalEnv);
    if (env2) return env2;
  } catch {
    // ignore
  }

  try {
    const extraValue =
      Constants.expoConfig?.extra?.backendUrl ??
      Constants.manifest2?.extra?.expoClient?.extra?.backendUrl;
    const env3 = normalizeUrl(typeof extraValue === 'string' ? extraValue : undefined);
    if (env3) return env3;
  } catch {
    // ignore
  }

  return undefined;
}

function resolveBackendUrl(): string {
  return getEnvBackendUrl() ?? '';
}

export const backendUrl = resolveBackendUrl();
export const api = createApi(backendUrl);

let warmupPromise: Promise<void> | null = null;

export const warmBackend = async (): Promise<void> => {
  if (!backendUrl) return;
  if (warmupPromise) return warmupPromise;

  warmupPromise = fetch(`${backendUrl}/api/health`)
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      warmupPromise = null;
    });

  return warmupPromise;
};
