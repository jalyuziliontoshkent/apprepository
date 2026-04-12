import { createApi } from './api';

/** Render production — telefon buildida .env dagi 192.168.* ishlatilmasin. */
const FALLBACK_PRODUCTION = 'https://lion-blinds-backend.onrender.com';

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

function resolveBackendUrl(): string {
  const raw = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (!raw) return FALLBACK_PRODUCTION;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return raw;
  if (isLikelyLanOrLocalhost(raw)) return FALLBACK_PRODUCTION;
  return raw;
}

export const api = createApi(resolveBackendUrl());
