import { supabase } from '../../lib/supabase';
import { useAuthStore, User } from '../../store/useAuthStore';

export const AuthService = {
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error('Sessiya yaratilmadi');
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      throw new Error('Foydalanuvchi profilini olishda xatolik');
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email ?? '',
      role: (userData?.role ??
        data.user.app_metadata?.role ??
        data.user.user_metadata?.role ??
        'dealer') as User['role'],
      name: userData?.name ?? data.user.user_metadata?.name,
      ...(userData ?? {}),
    };

    await useAuthStore.getState().setUser(user, data.session.access_token);
    return user;
  },

  async logout(): Promise<void> {
    await useAuthStore.getState().logout();
  },

  async refreshSession(): Promise<string | null> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      return null;
    }

    await useAuthStore.getState().setUser(useAuthStore.getState().user, data.session.access_token);
    return data.session.access_token;
  },
};
