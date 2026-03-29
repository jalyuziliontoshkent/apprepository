import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email va parolni kiriting');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Xatolik yuz berdi');
      }
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      if (data.user.role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(dealer)/dashboard');
      }
    } catch (e: any) {
      setError(e.message || 'Tarmoq xatoligi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <Image
        source={{ uri: 'https://static.prod-images.emergentagent.com/jobs/f315529b-cdd9-4734-9d45-3cdd0c03f171/images/bd3a48a86df01b2bd113325a4a18a174e2df95010aee1bfeab877644392d1f2c.png' }}
        style={styles.bgImage}
        blurRadius={2}
      />
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://static.prod-images.emergentagent.com/jobs/f315529b-cdd9-4734-9d45-3cdd0c03f171/images/8feb61d3532ccbdb7feeb97a1dc5779a055c665d188e4851369982bfdefaef13.png' }}
            style={styles.logo}
          />
          <Text style={styles.title}>CurtainOrder</Text>
          <Text style={styles.subtitle}>Premium Buyurtma Tizimi</Text>
        </View>

        <View style={styles.glassCard}>
          <View style={styles.glassInner}>
            <Text style={styles.cardTitle}>Tizimga Kirish</Text>

            {error ? (
              <View style={styles.errorBox} testID="login-error">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                testID="login-email-input"
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Parol</Text>
              <TextInput
                testID="login-password-input"
                style={styles.input}
                placeholder="Parolingizni kiriting"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              testID="login-submit-button"
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.loginBtnText}>Kirish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerText}>
          Pardalar va Jalyuzilar ERP Tizimi
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  bgImage: {
    position: 'absolute', width, height, opacity: 0.3,
  },
  overlay: {
    position: 'absolute', width, height,
    backgroundColor: 'rgba(5,5,5,0.6)',
  },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: 36, marginBottom: 16 },
  title: {
    fontSize: 32, fontWeight: '300', color: '#fff', letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4, letterSpacing: 2,
    textTransform: 'uppercase',
  },
  glassCard: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  glassInner: { padding: 28 },
  cardTitle: {
    fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 24, textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(255,80,80,0.15)', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,80,80,0.3)',
  },
  errorText: { color: '#ff5050', fontSize: 13, textAlign: 'center' },
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  input: {
    height: 52, backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 18, fontSize: 16, color: '#fff',
  },
  loginBtn: {
    height: 52, backgroundColor: '#fff', borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  footerText: {
    fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 32, letterSpacing: 1,
  },
});
