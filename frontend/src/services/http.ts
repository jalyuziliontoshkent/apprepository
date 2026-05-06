import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_ACCESS_TOKEN_KEY } from '../modules/auth/contracts';
import { useAuthStore } from '../store/useAuthStore';
import { backendUrl } from './apiClient';
import { ApiError } from './errors';

export const getAccessToken = async (): Promise<string | null> => {
  const token = useAuthStore.getState().token;
  if (token) return token;
  return AsyncStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
};

export const getAuthorizedHeaders = async (
  headers: HeadersInit = {},
): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  const normalized = headers instanceof Headers
    ? Object.fromEntries(headers.entries())
    : Array.isArray(headers)
      ? Object.fromEntries(headers)
      : { ...(headers as Record<string, string>) };

  if (token) {
    normalized.Authorization = `Bearer ${token}`;
  }

  return normalized;
};

export const fetchApiRaw = async (path: string, init: RequestInit = {}) => {
  if (!backendUrl) {
    throw new ApiError('Backend URL sozlanmagan (EXPO_PUBLIC_BACKEND_URL)', 'NETWORK');
  }

  const headers = await getAuthorizedHeaders(init.headers);
  return fetch(`${backendUrl}/api${path}`, {
    ...init,
    headers,
  });
};
