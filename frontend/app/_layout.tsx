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

  // Track whether we've already validated this token so we don't run it again.
  const validatedTokenRef = useRef<string | null>(null);
  // Prevent navigation while session validation is still in-flight.
  const [isValidating, setIsValidating] = useState(false);

  // Step 1: Hydrate store from AsyncStorage on mount.
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Step 2: Safety timeout – if store is stuck, unblock it.
  useEffect(() => {
    const t = setTimeout(() => {
      const s = useAuthStore.getState();
      if (s.isLoading || !s.isHydrated) {
        useAuthStore.setState({ isLoading: false, isHydrated: true });
      }
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Step 3: Warm up backend (non-blocking).
  useEffect(() => {
    void warmBackend();
  }, []);

  // Step 4: Validate session once per token value.
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
        const refreshed = await AuthService.refreshSession();
        if (!cancelled && !refreshed) {
          // Only clear session on hard 401, not on network errors.
          // AuthService.refreshSession already returns token on network hiccup.
          console.log('[AuthGuard] Session invalid – clearing and going to login');
        }
      } finally {
        if (!cancelled) setIsValidating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isHydrated, isLoading, refreshToken, token, user]);

  // Step 5: Route guard – runs AFTER validation is done.
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
        console.log('[AuthGuard] No auth, → login');
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
      console.log('[AuthGuard] Logged in → ', dest);
      router.replace(dest as never);
    }
  }, [currentSegment, isHydrated, isLoading, isValidating, refreshToken, router, token, user]);

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
