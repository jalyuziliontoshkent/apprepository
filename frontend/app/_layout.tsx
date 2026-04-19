import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useAuthStore } from '../src/store/useAuthStore';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useAppStore } from '../src/utils/store';
import { useTheme } from '../src/utils/theme';
import { api, warmBackend } from '../src/services/apiClient';

export { api };

const navigateTo = (path: string, router: ReturnType<typeof useRouter>) => {
  router.replace(path as never);
};

function AuthGuard() {
  const { user, token, isLoading, isHydrated, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const currentSegment = String(segments[0] ?? '');

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.isLoading || !state.isHydrated) {
        console.log('[AuthGuard] Forcing hydration after timeout');
        useAuthStore.setState({
          isLoading: false,
          isHydrated: true,
        });
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    void warmBackend();
  }, []);

  useEffect(() => {
    console.log('[AuthGuard] State:', { isLoading, isHydrated, hasUser: !!user, hasToken: !!token, currentSegment });

    if (isLoading || !isHydrated) {
      return;
    }

    const inProtectedGroup =
      currentSegment === 'admin' ||
      currentSegment === 'dealer' ||
      currentSegment === 'worker';

    const isLoginPage = currentSegment === 'index' || currentSegment === '';

    if (!user || !token) {
      if (inProtectedGroup) {
        console.log('[AuthGuard] No auth, redirecting to login from protected route');
        navigateTo('/', router);
      }
      return;
    }

    // User is logged in
    if (isLoginPage) {
      const destination =
        user.role === 'admin'
          ? '/admin/dashboard'
          : user.role === 'worker'
            ? '/worker/tasks'
            : '/dealer/dashboard';
      console.log('[AuthGuard] Logged in user on login page, redirecting to:', destination);
      navigateTo(destination, router);
    }
  }, [currentSegment, isHydrated, isLoading, router, token, user]);

  return null;
}

function RootNavigator() {
  const c = useTheme();
  const theme = useAppStore((s) => s.theme);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="dealer" options={{ headerShown: false }} />
        <Stack.Screen name="worker" options={{ headerShown: false }} />
      </Stack>
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
