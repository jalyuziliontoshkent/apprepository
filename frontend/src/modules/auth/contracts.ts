export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'worker' | 'dealer';
  name?: string;
  phone?: string;
  address?: string;
  credit_limit?: number;
  debt?: number;
  [key: string]: unknown;
}

export interface AuthSessionResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  token: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface LogoutPayload {
  refresh_token?: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

export const AUTH_ACCESS_TOKEN_KEY = 'auth.access_token';
export const AUTH_REFRESH_TOKEN_KEY = 'auth.refresh_token';
export const AUTH_USER_KEY = 'auth.user';
export const AUTH_EXPIRES_AT_KEY = 'auth.expires_at';
