import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../src/utils/store';
import { api as apiClient } from '../src/services/apiClient';
import { initMonitoring } from '../src/services/monitoring';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { registerForPushNotifications } from '../src/services/notifications';

export const api = apiClient;

export type UserType = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'dealer' | 'worker';
  phone?: string;
  address?: string;
  credit_limit?: number;
  debt?: number;
};

export type AuthState = {
  user: UserType | null;
  token: string | null;
  loading: boolean;
};

export default function RootLayout() {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, loading: true });
  const segments = useSegments();
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      // Load theme & currency settings
      await useAppStore.getState().loadSettings();
      // Fetch exchange rate
      try {
        const rateData = await api('/exchange-rate', { cacheKey: 'exchange-rate', cacheTtlMs: 5 * 60 * 1000 });
        if (rateData?.rate) useAppStore.getState().setExchangeRate(rateData.rate);
      } catch {}
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        setAuth({ user, token, loading: false });
      } else {
        setAuth({ user: null, token: null, loading: false });
      }
    } catch {
      setAuth({ user: null, token: null, loading: false });
    }
  }, []);

  useEffect(() => {
    initMonitoring();
    checkAuth();
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = response.notification.request.content.data?.target as string | undefined;
      if (target) router.push(target as any);
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (auth.loading) return;
    const inAuthGroup = segments[0] === '(admin)' || segments[0] === '(dealer)' || segments[0] === '(worker)';
    if (!auth.user && inAuthGroup) {
      router.replace('/');
    } else if (auth.user) {
      if (auth.user.role === 'admin' && segments[0] !== '(admin)') {
        router.replace('/(admin)/dashboard');
      } else if (auth.user.role === 'dealer' && segments[0] !== '(dealer)') {
        router.replace('/(dealer)/dashboard');
      } else if (auth.user.role === 'worker' && segments[0] !== '(worker)') {
        router.replace('/(worker)/tasks');
      }
    }
  }, [auth.user, auth.loading, segments]);

  if (auth.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#050505' }}>
          <OfflineBanner />
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050505' }, animation: 'fade' }} />
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
