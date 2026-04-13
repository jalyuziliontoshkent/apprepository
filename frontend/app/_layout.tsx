import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/useAuthStore';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useAppStore } from '../src/utils/store';
import { useTheme } from '../src/utils/theme';
import { api } from '../src/services/apiClient';

export { api };

function AuthGuard() {
  const { user, token, isLoading, initialize, logout, setUser } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token || !session.user) {
        await logout();
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      await setUser(
        {
          id: session.user.id,
          email: session.user.email ?? '',
          role: (profile?.role ??
            session.user.app_metadata?.role ??
            session.user.user_metadata?.role ??
            'dealer') as 'admin' | 'dealer' | 'worker',
          name: profile?.name ?? session.user.user_metadata?.name,
          ...(profile ?? {}),
        },
        session.access_token,
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, logout, setUser]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inProtectedGroup =
      segments[0] === '(admin)' ||
      segments[0] === '(dealer)' ||
      segments[0] === '(worker)';

    if (!user || !token) {
      if (inProtectedGroup) {
        router.replace('/');
      }
      return;
    }

    if (!inProtectedGroup) {
      const destination =
        user.role === 'admin'
          ? '/(admin)/dashboard'
          : user.role === 'worker'
            ? '/(worker)/tasks'
            : '/(dealer)/dashboard';

      router.replace(destination as never);
    }
  }, [isLoading, router, segments, token, user]);

  return null;
}

function LoadingSplash() {
  const c = useTheme();

  return (
    <View style={[styles.splash, { backgroundColor: c.bg }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}

function RootNavigator() {
  const c = useTheme();
  const theme = useAppStore((s) => s.theme);
  const isLoading = useAuthStore((s) => s.isLoading);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AuthGuard />
      {isLoading ? (
        <LoadingSplash />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(dealer)" options={{ headerShown: false }} />
          <Stack.Screen name="(worker)" options={{ headerShown: false }} />
        </Stack>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
