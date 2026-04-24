import { createApi } from './api';

function getEnvBackendUrl(): string | undefined {
  try {
    const envVar = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_BACKEND_URL : undefined;
    const env1 = typeof envVar === 'string' ? envVar.trim() : undefined;
    if (env1) return env1;
  } catch {
    // ignore
  }

  try {
    const globalEnv = typeof global !== 'undefined' ? (global as any).__ENV__?.EXPO_PUBLIC_BACKEND_URL : undefined;
    const env2 = typeof globalEnv === 'string' ? globalEnv.trim() : undefined;
    if (env2) return env2;
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
