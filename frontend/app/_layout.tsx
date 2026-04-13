import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useAuthStore } from '../src/store/useAuthStore';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useAppStore } from '../src/utils/store';
import { useTheme } from '../src/utils/theme';
import { api } from '../src/services/apiClient';

export { api };

function AuthGuard() {
  const { user, token, isLoading, isHydrated, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading || !isHydrated) {
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
  }, [isHydrated, isLoading, router, segments, token, user]);

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
  const isHydrated = useAuthStore((s) => s.isHydrated);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AuthGuard />
      {isLoading || !isHydrated ? (
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
