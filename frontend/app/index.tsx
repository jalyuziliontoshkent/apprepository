import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Mail, Lock, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { useAuthStore } from '../src/store/useAuthStore';
import { AuthService } from '../src/modules/auth/AuthService';
import { useTheme } from '../src/utils/theme';
import { useAppStore } from '../src/utils/store';
import { typography, spacing, radius } from '../src/theme/theme';

export default function LoginScreen() {
  const isWeb = Platform.OS === 'web';
  const router   = useRouter();
  const c        = useTheme();
  const theme    = useAppStore((s) => s.theme);
  const { user, token, isLoading } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const navigateAfterLogin = useCallback((role: 'admin' | 'worker' | 'dealer') => {
    const destination =
      role === 'admin'
        ? '/admin/dashboard'
        : role === 'worker'
          ? '/worker/tasks'
          : '/dealer/dashboard';

    if (typeof window !== 'undefined') {
      window.location.replace(destination);
      return;
    }

    router.replace(destination as any);
  }, [router]);

  // Animated shake for error
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(isWeb ? 1 : 0)).current;

  useEffect(() => {
    if (isWeb) {
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, isWeb]);

  // Redirect once auth state is resolved
  useEffect(() => {
    if (isLoading || !user || !token) return;
    navigateAfterLogin(user.role);
  }, [user, token, isLoading, navigateAfterLogin]);

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: !isWeb }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: !isWeb }),
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: !isWeb }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: !isWeb }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: !isWeb }),
    ]).start();
  }, [isWeb, shakeAnim]);

  const handleLogin = useCallback(async () => {
    const trimmedEmail    = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Email va parolni kiriting.');
      triggerShake();
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setError('To\'g\'ri email kiriting.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    console.log('[Login] Attempting login for:', trimmedEmail);

    try {
      const loggedInUser = await AuthService.login(trimmedEmail, trimmedPassword);
      console.log('[Login] Success, user role:', loggedInUser.role);
      navigateAfterLogin(loggedInUser.role);
    } catch (e: any) {
      console.error('[Login] Error:', e);
      let msg = 'Xatolik yuz berdi. Qayta urinib ko\'ring.';
      
      if (e?.message === 'Invalid login credentials' || e?.message === "Email yoki parol noto'g'ri") {
        msg = 'Email yoki parol noto\'g\'ri.';
      } else if (e?.code === 'NETWORK' || e?.message?.includes('Backend URL')) {
        msg = 'Serverga ulanishda xatolik. Iltimos, internet ulanishingizni tekshiring.';
      } else if (e?.message) {
        msg = e.message;
      }
      
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  }, [email, navigateAfterLogin, password, triggerShake]);

  // Show spinner during initial session restoration
  if (isLoading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Text style={{ color: c.textSec }}>Yuklanmoqda...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bg }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* Background gradient accent */}
      <View style={[s.bgAccent, s.noPointerEvents]}>
        <LinearGradient
          colors={['rgba(108,99,255,0.18)', 'transparent']}
          style={s.bgGrad}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kav}
      >
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>

          {/* Logo / Brand */}
          <View style={s.brand}>
            <View style={[s.logoBox, { backgroundColor: '#000000' }]}>
              <Image
                source={require('../assets/images/lion-blinds-logo.jpg')}
                style={s.logoImage}
                contentFit="contain"
              />
            </View>
          </View>

          {/* Heading */}
          <View style={s.heading}>
            <Text style={[s.title, { color: c.text }]}>Xush kelibsiz</Text>
            <Text style={[s.subtitle, { color: c.textSec }]}>
              Ishni boshlash uchun akkauntingizga kiring
            </Text>
          </View>

          {/* Form */}
          <Animated.View
            style={[s.form, { transform: [{ translateX: shakeAnim }] }]}
          >
            {error ? (
              <View style={[s.errorBox, { backgroundColor: c.dangerSoft, borderColor: c.danger + '30' }]}>
                <AlertCircle size={16} color={c.danger} />
                <Text style={[s.errorText, { color: c.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Elektron pochta"
              placeholder="admin@curtain.uz"
              hint="Masalan: admin@curtain.uz"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              leftIcon={<Mail size={18} color={c.textTer} />}
              error={error && !email.trim() ? ' ' : undefined}
            />

            <Input
              label="Parol"
              placeholder="Parolingizni kiriting"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              leftIcon={<Lock size={18} color={c.textTer} />}
              error={error && !password.trim() ? ' ' : undefined}
            />

            <View style={s.btnWrap}>
              <Button
                title={loading ? '' : 'Tizimga kirish'}
                loading={loading}
                onPress={handleLogin}
                size="lg"
              />
            </View>
          </Animated.View>

        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1 },
  splash:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kav:      { flex: 1, justifyContent: 'center' },
  bgAccent: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  bgGrad:   { width: '100%', height: 400, borderRadius: 300, transform: [{ translateY: -200 }] },
  content:  { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  noPointerEvents: {
    pointerEvents: 'none',
  },

  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  logoBox: {
    width: 240,
    height: 140,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },

  heading: {
    marginBottom: spacing.xl + spacing.xs,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body1,
    textAlign: 'center',
    lineHeight: 24,
  },

  form:   { width: '100%' },
  btnWrap: { marginTop: spacing.md },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body2,
    flex: 1,
    fontWeight: '500',
  },
});
