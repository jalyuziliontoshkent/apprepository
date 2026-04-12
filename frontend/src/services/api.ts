import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCache, setCache } from './cache';
import { ApiError, mapHttpError } from './errors';
import { trackApiFailure, trackApiSuccess } from './telemetry';

const API_TIMEOUT_MS = 8000;
const TOKEN_CACHE_TTL_MS = 5000;
const DEFAULT_RETRIES = 1;
const RETRY_DELAY_MS = 250;

type RequestOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  dedup?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
};

let tokenCache: { value: string | null; expiresAt: number } = { value: null, expiresAt: 0 };
const pendingGetRequests = new Map<string, Promise<any>>();

const getAuthToken = async () => {
  const now = Date.now();
  if (now < tokenCache.expiresAt) return tokenCache.value;
  const token = await AsyncStorage.getItem('token');
  tokenCache = { value: token, expiresAt: now + TOKEN_CACHE_TTL_MS };
  return token;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (error: unknown, method: string, attempt: number, retries: number) => {
  if (method !== 'GET') return false;
  if (attempt >= retries) return false;
  if (error instanceof ApiError) {
    return error.code === 'TIMEOUT' || error.code === 'NETWORK' || error.code === 'SERVER';
  }
  return true;
};

const parseError = async (res: Response) => {
  const fallback = 'Xatolik yuz berdi';
  const err = await res.json().catch(() => ({ detail: fallback }));
  const message = typeof err?.detail === 'string' ? err.detail : fallback;
  return mapHttpError(res.status, message, err);
};

const executeRequest = async (baseUrl: string, path: string, options: RequestOptions = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const retries = options.retries ?? DEFAULT_RETRIES;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? API_TIMEOUT_MS);

    try {
      const token = await getAuthToken();
      const headers: any = { 'Content-Type': 'application/json', ...options.headers };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/api${path}`, {
        ...options,
        method,
        headers,
        signal: controller.signal,
      });

      if (!res.ok) throw await parseError(res);
      trackApiSuccess(Date.now() - startedAt);
      return await res.json();
    } catch (error: any) {
      const normalized =
        error?.name === 'AbortError'
          ? new ApiError("So'rov timeout bo'ldi", 'TIMEOUT')
          : error instanceof ApiError
          ? error
          : new ApiError('Tarmoq xatosi', 'NETWORK');

      if (normalized.code === 'UNAUTHORIZED') {
        tokenCache = { value: null, expiresAt: 0 };
        await AsyncStorage.multiRemove(['token', 'user']).catch(() => undefined);
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.replace('/');
        }
      }

      trackApiFailure(Date.now() - startedAt);
      if (shouldRetry(normalized, method, attempt, retries)) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw normalized;
    } finally {
      clearTimeout(timeout);
    }
  }
};

export const createApi = (baseUrl?: string) => {
  const resolvedBaseUrl =
    baseUrl?.trim() ||
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');

  return async <T = any>(path: string, options: RequestOptions = {}): Promise<T> => {
    if (!resolvedBaseUrl) {
      throw new ApiError("EXPO_PUBLIC_BACKEND_URL sozlanmagan", 'NETWORK');
    }
    const method = (options.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const cacheKey = options.cacheKey;
    const cacheTtlMs = options.cacheTtlMs ?? 0;

    if (isGet && cacheKey) {
      const cached = await getCache<T>(cacheKey);
      if (cached) return cached;
    }

    const dedupKey = isGet && options.dedup !== false ? `${method}:${path}` : '';
    if (dedupKey && pendingGetRequests.has(dedupKey)) {
      return pendingGetRequests.get(dedupKey) as Promise<T>;
    }

    const reqPromise = executeRequest(resolvedBaseUrl, path, options).then(async (data) => {
      if (isGet && cacheKey && cacheTtlMs > 0) {
        await setCache(cacheKey, data, cacheTtlMs);
      }
      return data as T;
    });

    if (dedupKey) pendingGetRequests.set(dedupKey, reqPromise);
    try {
      return await reqPromise;
    } finally {
      if (dedupKey) pendingGetRequests.delete(dedupKey);
    }
  };
};
