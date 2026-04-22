import { api } from '../../services/apiClient';
import { ApiError, isApiError } from '../../services/errors';
import { useAuthStore, User } from '../../store/useAuthStore';

type LoginResponse = {
  token: string;
  user: User;
};

type MeResponse = {
  user: User;
};

const normalizeUser = (user: User): User => ({
  ...user,
  id: String(user.id),
  email: String(user.email ?? '').trim().toLowerCase(),
  role: (user.role ?? 'dealer') as User['role'],
});

export const AuthService = {
  async login(email: string, password: string): Promise<User> {
    console.log('[AuthService] Login started for:', email);
    try {
      const response = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
        dedup: false,
      });

      const user = normalizeUser(response.user);
      console.log('[AuthService] Login success, user:', user.email, 'role:', user.role);
      await useAuthStore.getState().setUser(user, response.token);
      return user;
    } catch (error: any) {
      console.error('[AuthService] Login error:', error?.message || error);
      if (isApiError(error)) {
        if (error.code === 'UNAUTHORIZED') {
          throw new ApiError("Email yoki parol noto'g'ri.", 'UNAUTHORIZED', error.status, error.details);
        }
        throw error;
      }

      throw new ApiError("Serverga ulanib bo'lmadi." + (error?.message ? ' (' + error.message + ')' : ''), 'NETWORK');
    }
  },

  async logout(): Promise<void> {
    await useAuthStore.getState().logout();
  },

  async refreshSession(): Promise<string | null> {
    const { token, user } = useAuthStore.getState();
    if (!token || !user) {
      return null;
    }

    try {
      const response = await api<MeResponse>('/auth/me', {
        method: 'GET',
        dedup: false,
      });

      await useAuthStore.getState().setUser(normalizeUser(response.user), token);
      return token;
    } catch (error) {
      if (isApiError(error) && error.code === 'UNAUTHORIZED') {
        await useAuthStore.getState().clearSession();
        return null;
      }

      // Network/server hiccups should not immediately throw the user out.
      return token;
    }
  },
};
