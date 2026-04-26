import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { AuthService } from '../src/modules/auth/AuthService';
import { useAuthStore } from '../src/store/useAuthStore';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useAppStore } from '../src/utils/store';
import { useTheme } from '../src/utils/theme';
import { api, warmBackend } from '../src/services/apiClient';

export { api };

function AuthGuard() {
  const { user, token, refreshToken, isLoading, isHydrated, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const currentSegment = String(segments[0] ?? '');
  const validatedTokenRef = useRef<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const authState = useAuthStore.getState();
      if (authState.isLoading || !authState.isHydrated) {
        useAuthStore.setState({ isLoading: false, isHydrated: true });
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    void warmBackend();
  }, []);

  useEffect(() => {
    if (isLoading || !isHydrated) return;
    if (!user || !refreshToken) {
      validatedTokenRef.current = null;
      return;
    }
    if (validatedTokenRef.current === token) return;

    validatedTokenRef.current = token;
    let cancelled = false;

    setIsValidating(true);
    void (async () => {
      try {
        await AuthService.refreshSession();
      } finally {
        if (!cancelled) setIsValidating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, isLoading, refreshToken, token, user]);

  useEffect(() => {
    if (isLoading || !isHydrated || isValidating) return;

    const inProtected =
      currentSegment === 'admin' ||
      currentSegment === 'dealer' ||
      currentSegment === 'worker';

    const isLoginPage =
      currentSegment === 'index' || currentSegment === '' || currentSegment === 'register';

    if (!user || !refreshToken) {
      if (inProtected) {
        router.replace('/' as never);
      }
      return;
    }

    if (isLoginPage) {
      const dest =
        user.role === 'admin'
          ? '/admin/dashboard'
          : user.role === 'worker'
            ? '/worker/tasks'
            : '/dealer/dashboard';
      router.replace(dest as never);
    }
  }, [currentSegment, isHydrated, isLoading, isValidating, refreshToken, router, user]);

  return null;
}

function RootNavigator() {
  const c = useTheme();
  const theme = useAppStore((state) => state.theme);

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
        <Stack.Screen name="register" options={{ headerShown: false }} />
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
