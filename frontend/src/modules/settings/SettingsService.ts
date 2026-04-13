import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';

export const SettingsService = {
  async fetchSettings() {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('[SettingsService] Failed to fetch settings, using defaults');
    }

    return data ?? { notifications: true, theme: 'dark' };
  },

  async updateSettings(updates: Record<string, unknown>) {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAccount() {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('delete_user_account', { uid: userId });
    if (error) throw error;
    await useAuthStore.getState().logout();
  },
};
