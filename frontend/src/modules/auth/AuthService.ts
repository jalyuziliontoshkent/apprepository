import { backendUrl, api } from '../../services/apiClient';
import { ApiError, isApiError } from '../../services/errors';
import {
  type AuthSessionResponse,
  type LoginPayload,
  type RegisterPayload,
} from './contracts';
import { useAuthStore, type User } from '../../store/useAuthStore';

type MeResponse = {
  user: User;
};

const normalizeUser = (user: User): User => ({
  ...user,
  id: String(user.id),
  email: String(user.email ?? '').trim().toLowerCase(),
  role: (user.role ?? 'dealer') as User['role'],
});

const persistSession = async (response: AuthSessionResponse): Promise<User> => {
  const user = normalizeUser(response.user);
  await useAuthStore.getState().setSession({
    user,
    token: response.access_token,
    refreshToken: response.refresh_token,
    accessTokenExpiresAt: response.expires_at,
  });
  return user;
};

const mapAuthError = (error: unknown, fallback = "Serverga ulanib bo'lmadi.") => {
  if (isApiError(error)) {
    if (error.code === 'UNAUTHORIZED') {
      return new ApiError("Email yoki parol noto'g'ri.", 'UNAUTHORIZED', error.status, error.details);
    }
    return error;
  }

  const message = error instanceof Error ? error.message : '';
  return new ApiError(message ? `${fallback} (${message})` : fallback, 'NETWORK');
};

export const AuthService = {
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await api<AuthSessionResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        } satisfies LoginPayload),
        dedup: false,
      });

      return await persistSession(response);
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async register(payload: RegisterPayload): Promise<User> {
    try {
      const response = await api<AuthSessionResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          phone: payload.phone?.trim() ?? '',
          address: payload.address?.trim() ?? '',
        }),
        dedup: false,
      });

      return await persistSession(response);
    } catch (error) {
      if (isApiError(error)) {
        throw error;
      }
      throw mapAuthError(error, "Ro'yxatdan o'tishda xatolik yuz berdi.");
    }
  },

  async refreshAccessToken(): Promise<string | null> {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await api<AuthSessionResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
        dedup: false,
      });

      await persistSession(response);
      return response.access_token;
    } catch (error) {
      if (isApiError(error) && error.code === 'UNAUTHORIZED') {
        await useAuthStore.getState().clearSession();
        return null;
      }
      return useAuthStore.getState().token;
    }
  },

  async logout(): Promise<void> {
    const { token, refreshToken } = useAuthStore.getState();

    try {
      if (backendUrl) {
        await fetch(`${backendUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
        });
      }
    } catch {
      // Best effort logout only.
    } finally {
      await useAuthStore.getState().clearSession();
    }
  },

  async refreshSession(): Promise<string | null> {
    const { token, user, refreshToken, accessTokenExpiresAt } = useAuthStore.getState();
    if (!user || !refreshToken) {
      return null;
    }

    const expiresSoon = !accessTokenExpiresAt || Date.parse(accessTokenExpiresAt) - Date.now() < 60_000;
    if (!token || expiresSoon) {
      return this.refreshAccessToken();
    }

    try {
      const response = await api<MeResponse>('/auth/me', {
        method: 'GET',
        dedup: false,
      });

      await useAuthStore.getState().setSession({
        user: normalizeUser(response.user),
        token,
        refreshToken,
        accessTokenExpiresAt,
      });
      return token;
    } catch (error) {
      if (isApiError(error) && error.code === 'UNAUTHORIZED') {
        return this.refreshAccessToken();
      }
      return token;
    }
  },
};
