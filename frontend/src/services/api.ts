import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCache, getStaleCache, setCache } from './cache';
import { ApiError, mapHttpError } from './errors';
import { trackApiFailure, trackApiSuccess } from './telemetry';
import { useAuthStore } from '../store/useAuthStore';

const API_TIMEOUT_MS  = 55_000;
const DEFAULT_RETRIES = 2;
const RETRY_BASE_MS   = 800;

type RequestOptions = RequestInit & {
  timeoutMs?:  number;
  retries?:    number;
  dedup?:      boolean;
  cacheKey?:   string;
  cacheTtlMs?: number;
};

const pendingGetRequests = new Map<string, Promise<any>>();

const getAuthToken = async (): Promise<string | null> => {
  // Prefer zustand in-memory token (fastest path), fallback to AsyncStorage
  const storeToken = useAuthStore.getState().token;
  if (storeToken) return storeToken;
  return AsyncStorage.getItem('token');
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const shouldRetry = (
  error: unknown,
  method: string,
  attempt: number,
  retries: number,
  path: string,
): boolean => {
  if (attempt >= retries) return false;
  if (!(error instanceof ApiError)) return false;
  const retryable = error.code === 'TIMEOUT' || error.code === 'NETWORK' || error.code === 'SERVER';
  if (!retryable) return false;
  if (method === 'GET') return true;
  if (method === 'POST' && path.startsWith('/auth/')) return true;
  return false;
};

const resolveTimeout = (method: string, path: string, timeoutMs?: number) => {
  if (timeoutMs) return timeoutMs;
  if (method === 'POST' && path === '/orders') {
    return 70_000;
  }
  return API_TIMEOUT_MS;
};

const parseError = async (res: Response): Promise<ApiError> => {
  const fallback = 'Xatolik yuz berdi';
  let detail: string = fallback;
  try {
    const text = await res.text();
    if (text) {
      const parsed = JSON.parse(text);
      if (typeof parsed?.detail === 'string') detail = parsed.detail;
      else if (typeof parsed?.message === 'string') detail = parsed.message;
    }
  } catch { /* ignore parse errors */ }
  return mapHttpError(res.status, detail);
};

const executeRequest = async (
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<unknown> => {
  const method  = (options.method || 'GET').toUpperCase();
  const retries = options.retries ?? DEFAULT_RETRIES;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const startedAt  = Date.now();
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), resolveTimeout(method, path, options.timeoutMs));

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/api${path}`, {
        ...options,
        method,
        headers,
        signal: controller.signal,
      });

      if (!res.ok) throw await parseError(res);

      trackApiSuccess(Date.now() - startedAt);
      const text = await res.text();
      return text ? JSON.parse(text) : null;

    } catch (raw: any) {
      const rawMessage = typeof raw?.message === 'string' ? raw.message.toLowerCase() : '';
      const normalized: ApiError =
        raw?.name === 'AbortError'
          ? new ApiError(
              "Server javob bermadi. Internetingizni tekshiring yoki birozdan keyin qayta urinib ko'ring.",
              'TIMEOUT',
            )
          : raw instanceof ApiError
          ? raw
          : rawMessage.includes('failed to fetch') || rawMessage.includes('network request failed') || rawMessage.includes('load failed')
          ? new ApiError(
              "Serverga ulanishda xatolik. Backend javobi yoki CORS sozlamasini tekshiring.",
              'NETWORK',
            )
          : new ApiError(
              raw?.message || "Serverga ulanib bo'lmadi.",
              'NETWORK',
            );

      // Handle 401 — clear session and let AuthGuard redirect
      if (normalized.code === 'UNAUTHORIZED') {
        await useAuthStore.getState().logout().catch(() => {});
      }

      trackApiFailure(Date.now() - startedAt);

      if (shouldRetry(normalized, method, attempt, retries, path)) {
        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        continue;
      }
      throw normalized;
    } finally {
      clearTimeout(timer);
    }
  }

  // Unreachable, but satisfies TypeScript
  throw new ApiError('Max retries exceeded', 'NETWORK');
};

export const createApi = (baseUrl?: string) => {
  const resolvedBaseUrl = (baseUrl?.trim() || '');

  return async <T = any>(path: string, options: RequestOptions = {}): Promise<T> => {
    if (!resolvedBaseUrl) {
      throw new ApiError('Backend URL sozlanmagan (EXPO_PUBLIC_BACKEND_URL)', 'NETWORK');
    }

    const method     = (options.method || 'GET').toUpperCase();
    const isGet      = method === 'GET';
    const cacheKey   = options.cacheKey;
    const cacheTtlMs = options.cacheTtlMs ?? 0;

    // 1. Fresh cache hit
    if (isGet && cacheKey) {
      const cached = await getCache<T>(cacheKey);
      if (cached !== null) return cached;
    }

    // 2. Request deduplication
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
      // 3. Stale cache fallback on network/server errors
      if (isGet && cacheKey && e instanceof ApiError) {
        if (e.code === 'NETWORK' || e.code === 'TIMEOUT' || e.code === 'SERVER') {
          const stale = await getStaleCache<T>(cacheKey);
          if (stale !== null) return stale;
        }
      }
      throw e;
    } finally {
      if (dedupKey) pendingGetRequests.delete(dedupKey);
    }
  };
};
