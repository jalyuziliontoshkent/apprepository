import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../utils/store';
import { useAuthStore } from '../../store/useAuthStore';

type UserSettings = {
  notifications: boolean;
  theme: 'dark' | 'light';
};

const SETTINGS_KEY_PREFIX = 'user-settings:';

const getSettingsKey = (userId: string) => `${SETTINGS_KEY_PREFIX}${userId}`;

const defaultSettings = (): UserSettings => ({
  notifications: true,
  theme: useAppStore.getState().theme,
});

export const SettingsService = {
  async fetchSettings(): Promise<UserSettings> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      const raw = await AsyncStorage.getItem(getSettingsKey(userId));
      if (!raw) {
        return defaultSettings();
      }

      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      return {
        notifications: parsed.notifications ?? true,
        theme: parsed.theme === 'light' ? 'light' : 'dark',
      };
    } catch (error) {
      console.warn('[SettingsService] Failed to read settings, using defaults', error);
      return defaultSettings();
    }
  },

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const nextSettings = {
      ...(await this.fetchSettings()),
      ...updates,
    };

    await AsyncStorage.setItem(getSettingsKey(userId), JSON.stringify(nextSettings));

    if (nextSettings.theme !== useAppStore.getState().theme) {
      await useAppStore.getState().toggleTheme();
    }

    return nextSettings;
  },

  async deleteAccount(): Promise<void> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await AsyncStorage.removeItem(getSettingsKey(userId)).catch(() => {});
    await useAuthStore.getState().clearSession();
  },
};
