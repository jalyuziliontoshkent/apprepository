import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { AuthService } from '../src/modules/auth/AuthService';
import { useAuthStore } from '../src/store/useAuthStore';
import { useTheme } from '../src/utils/theme';

export default function LoginScreen() {
  const router = useRouter();
  const c = useTheme();
  const { user, token, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigateAfterLogin = useCallback((role: 'admin' | 'worker' | 'dealer') => {
    const destination =
      role === 'admin'
        ? '/admin/dashboard'
        : role === 'worker'
          ? '/worker/tasks'
          : '/dealer/dashboard';

    router.replace(destination as any);
  }, [router]);

  useEffect(() => {
    if (isLoading || !user || !token) {
      return;
    }

    navigateAfterLogin(user.role);
  }, [isLoading, navigateAfterLogin, token, user]);

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Email va parolni kiriting.');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setError("To'g'ri email kiriting.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const loggedInUser = await AuthService.login(trimmedEmail, trimmedPassword);
      navigateAfterLogin(loggedInUser.role);
    } catch (e: any) {
      let msg = "Xatolik yuz berdi. Qayta urinib ko'ring.";

      if (e?.message === 'Invalid login credentials' || e?.message === "Email yoki parol noto'g'ri") {
        msg = "Email yoki parol noto'g'ri.";
      } else if (e?.code === 'NETWORK' || e?.message?.includes('Backend URL')) {
        msg = 'Serverga ulanishda xatolik.';
      } else if (e?.message) {
        msg = e.message;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, navigateAfterLogin, password]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
        <StatusBar style="light" />
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: c.textSec }]}>Yuklanmoqda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#050608', '#06070B', '#090A12']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.backgroundLayer}>
        <LinearGradient
          colors={['rgba(108,99,255,0.22)', 'rgba(108,99,255,0)']}
          style={styles.glowTop}
        />
        <LinearGradient
          colors={['rgba(89,162,255,0.12)', 'rgba(89,162,255,0)']}
          style={styles.glowBottom}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <View style={styles.logoWrap}>
              <View style={[styles.logoFrame, { borderColor: c.cardBorder, backgroundColor: '#08090E' }]}>
                <Image
                  source={require('../assets/images/lion-blinds-logo.jpg')}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
              <Text style={[styles.brandTitle, { color: c.text }]}>Lion Blinds</Text>
              <Text style={[styles.brandSubtitle, { color: c.textTer }]}>
                Pardalar boshqaruv paneli
              </Text>
            </View>

            <View style={styles.formWrap}>
              <Input
                label=""
                placeholder="Email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                leftIcon={<Mail size={18} color={c.textTer} />}
              />

              <Input
                label=""
                placeholder="Parol"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError('');
                }}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                leftIcon={<Lock size={18} color={c.textTer} />}
              />

              {error ? (
                <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
              ) : null}

              <Button
                title={loading ? '' : 'Kirish'}
                loading={loading}
                onPress={handleLogin}
                size="lg"
                rightIcon={<ArrowRight size={18} color="#FFFFFF" />}
                style={styles.loginButton}
              />
            </View>

            <Text style={[styles.helper, { color: c.textTer }]}>
              Admin, diler va ishchi uchun yagona kirish oynasi
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -160,
    left: -60,
    width: 360,
    height: 360,
    borderRadius: 360,
  },
  glowBottom: {
    position: 'absolute',
    right: -110,
    bottom: -120,
    width: 340,
    height: 340,
    borderRadius: 340,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  content: {
    gap: 26,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 220,
  },
  logoFrame: {
    width: 108,
    height: 108,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
  },
  logo: {
    width: 84,
    height: 84,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  formWrap: {
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  loginButton: {
    marginTop: 4,
  },
  helper: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
