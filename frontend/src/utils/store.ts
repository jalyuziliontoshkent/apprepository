import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';
export type CurrencyMode = 'USD' | 'UZS';

interface AppStore {
  theme: ThemeMode;
  currency: CurrencyMode;
  exchangeRate: number;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setCurrency: (currency: CurrencyMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  toggleCurrency: () => Promise<void>;
  setExchangeRate: (rate: number) => Promise<void>;
}

type PersistedAppSettings = Pick<AppStore, 'theme' | 'currency' | 'exchangeRate'>;

const APP_SETTINGS_KEY = 'app-settings';
const DEFAULT_SETTINGS: PersistedAppSettings = {
  theme: 'dark',
  currency: 'USD',
  exchangeRate: 12800,
};

const sanitizeSettings = (value: unknown): PersistedAppSettings => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SETTINGS;
  }

  const next = value as Partial<PersistedAppSettings>;
  return {
    theme: next.theme === 'light' ? 'light' : 'dark',
    currency: next.currency === 'UZS' ? 'UZS' : 'USD',
    exchangeRate: typeof next.exchangeRate === 'number' && Number.isFinite(next.exchangeRate)
      ? next.exchangeRate
      : DEFAULT_SETTINGS.exchangeRate,
  };
};

const persistSettings = async (settings: PersistedAppSettings) => {
  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  setTheme: async (theme) => {
    const nextTheme: ThemeMode = theme === 'light' ? 'light' : 'dark';
    const nextSettings = { ...get(), theme: nextTheme };
    set({ theme: nextTheme });
    await persistSettings(sanitizeSettings(nextSettings));
  },

  setCurrency: async (currency) => {
    const nextCurrency: CurrencyMode = currency === 'UZS' ? 'UZS' : 'USD';
    const nextSettings = { ...get(), currency: nextCurrency };
    set({ currency: nextCurrency });
    await persistSettings(sanitizeSettings(nextSettings));
  },

  toggleTheme: async () => {
    const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    await get().setTheme(nextTheme);
  },

  toggleCurrency: async () => {
    const nextCurrency: CurrencyMode = get().currency === 'USD' ? 'UZS' : 'USD';
    await get().setCurrency(nextCurrency);
  },

  setExchangeRate: async (rate) => {
    const nextRate = Number.isFinite(rate) && rate > 0
      ? Math.round(rate)
      : DEFAULT_SETTINGS.exchangeRate;
    const nextSettings = { ...get(), exchangeRate: nextRate };
    set({ exchangeRate: nextRate });
    await persistSettings(sanitizeSettings(nextSettings));
  },
}));

const fetchExchangeRate = async (): Promise<number | null> => {
  try {
    const res = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
    const data = await res.json();
    const usd = data.find((item: any) => item.Ccy === 'USD');
    if (usd && usd.Rate) {
      return Number(usd.Rate);
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch realtime exchange rate:', error);
    return null;
  }
};

const hydrateAppStore = async () => {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      useAppStore.setState(sanitizeSettings(parsed));
    }

    // Auto-fetch real-time USD rate from CBU API
    const liveRate = await fetchExchangeRate();
    if (liveRate) {
      void useAppStore.getState().setExchangeRate(liveRate);
    }
  } catch {
    // Ignore hydration errors and keep defaults.
  }
};

void hydrateAppStore();
