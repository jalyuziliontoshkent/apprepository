import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCache, getStaleCache, setCache } from './cache';
import { ApiError, mapHttpError } from './errors';
import { trackApiFailure, trackApiSuccess } from './telemetry';

/** Render uyg‘onguncha 30–60s kutishi mumkin — qisqa timeout telefonda "tarmoq xatosi". */
const API_TIMEOUT_MS = 55_000;
const TOKEN_CACHE_TTL_MS = 5000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 800;

type RequestOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  dedup?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
};

const pendingGetRequests = new Map<string, Promise<any>>();

const getAuthToken = async () => {
  return await AsyncStorage.getItem('token');
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (
  error: unknown,
  method: string,
  attempt: number,
  retries: number,
  path: string,
) => {
  if (attempt >= retries) return false;
  if (!(error instanceof ApiError)) return false;
  const retryable = error.code === 'TIMEOUT' || error.code === 'NETWORK' || error.code === 'SERVER';
  if (!retryable) return false;
  if (method === 'GET') return true;
  if (method === 'POST' && path.startsWith('/auth/')) return true;
  return false;
};

const parseError = async (res: Response) => {
  const fallback = 'Xatolik yuz berdi';
  let err: { detail?: string } = { detail: fallback };
  try {
    const text = await res.text();
    if (text) err = JSON.parse(text);
  } catch {
    /* HTML yoki bo‘sh javob (masalan Render 502) */
  }
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
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new ApiError('Server javobi noto‘g‘ri formatda', 'SERVER', res.status);
      }
      return data;
    } catch (error: any) {
      const normalized =
        error?.name === 'AbortError'
          ? new ApiError(
              "Server javob bermadi (juda uzoq kutildi). Internetni tekshiring yoki birozdan keyin qayta urinib ko'ring.",
              'TIMEOUT',
            )
          : error instanceof ApiError
          ? error
          : new ApiError(
              error?.message && typeof error.message === 'string' && error.message !== 'Network request failed'
                ? error.message
                : "Serverga ulanib bo'lmadi. Internet yoki server holatini tekshiring.",
              'NETWORK',
            );

      if (normalized.code === 'UNAUTHORIZED') {
        await AsyncStorage.multiRemove(['token', 'user']).catch(() => undefined);
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.replace('/');
        }
      }

      trackApiFailure(Date.now() - startedAt);
      if (shouldRetry(normalized, method, attempt, retries, path)) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
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
    } catch (e) {
      if (
        isGet &&
        cacheKey &&
        e instanceof ApiError &&
        (e.code === 'NETWORK' || e.code === 'TIMEOUT' || e.code === 'SERVER')
      ) {
        const stale = await getStaleCache<T>(cacheKey);
        if (stale !== null) return stale;
      }
      throw e;
    } finally {
      if (dedupKey) pendingGetRequests.delete(dedupKey);
    }
  };
};
