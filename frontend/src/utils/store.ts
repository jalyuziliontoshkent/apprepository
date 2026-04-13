import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode    = 'dark' | 'light';
export type CurrencyMode = 'USD'  | 'UZS';

interface AppStore {
  theme:           ThemeMode;
  currency:        CurrencyMode;
  exchangeRate:    number;
  toggleTheme:     () => Promise<void>;
  toggleCurrency:  () => Promise<void>;
  setExchangeRate: (rate: number) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme:        'dark',
      currency:     'USD',
      exchangeRate: 12800,

      toggleTheme: async () => {
        const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
      },

      toggleCurrency: async () => {
        const next: CurrencyMode = get().currency === 'USD' ? 'UZS' : 'USD';
        set({ currency: next });
      },

      setExchangeRate: (rate) => set({ exchangeRate: rate }),
    }),
    {
      name:    'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
