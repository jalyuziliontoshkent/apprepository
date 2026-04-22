import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { AuthService } from '../src/modules/auth/AuthService';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
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
      const user = await AuthService.login(trimmedEmail, password);
      const dest =
        user.role === 'admin'
          ? '/admin/dashboard'
          : user.role === 'worker'
            ? '/worker/tasks'
            : '/dealer/dashboard';
      router.replace(dest as never);
    } catch (e: any) {
      if (
        e?.message?.includes("noto'g'ri") ||
        e?.message === 'Invalid login credentials'
      ) {
        setError("Email yoki parol noto'g'ri.");
      } else if (e?.code === 'NETWORK' || e?.message?.includes('ulanib')) {
        setError('Serverga ulanishda xatolik.');
      } else {
        setError(e?.message || "Xatolik yuz berdi. Qayta urinib ko'ring.");
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <Image
                source={require('../assets/images/lion-blinds-logo.jpg')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Text style={styles.brand}>Lion Blinds</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Parol"
              placeholderTextColor="#666"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />

            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Kirish  →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 40,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 64,
    height: 64,
  },
  brand: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  error: {
    color: '#FF453A',
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  btn: {
    backgroundColor: '#5B4FE8',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
