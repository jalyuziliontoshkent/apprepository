import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { AuthService } from '../src/modules/auth/AuthService';
import { ApiError } from '../src/services/errors';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      setError("Ism, email va parolni to'ldiring.");
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setError("To'g'ri email kiriting.");
      return;
    }
    if (password.length < 8) {
      setError("Parol kamida 8 ta belgi bo'lishi kerak.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await AuthService.register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        phone,
        address,
      });

      const destination =
        user.role === 'admin'
          ? '/admin/dashboard'
          : user.role === 'worker'
            ? '/worker/tasks'
            : '/dealer/dashboard';
      router.replace(destination as never);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Ro'yxatdan o'tishda xatolik yuz berdi.");
      }
    } finally {
      setLoading(false);
    }
  }, [address, email, name, password, phone, router]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Hisob yaratish</Text>
            <Text style={styles.subtitle}>Dealer kabinetiga xavfsiz kirish uchun yangi akkaunt oching.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Ism"
              placeholderTextColor="#666"
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError('');
              }}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Parol"
              placeholderTextColor="#666"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setError('');
              }}
              secureTextEntry
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefon (ixtiyoriy)"
              placeholderTextColor="#666"
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Manzil (ixtiyoriy)"
              placeholderTextColor="#666"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              editable={!loading}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ro'yxatdan o'tish</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/' as never)} disabled={loading}>
              <Text style={styles.link}>Akkauntingiz bormi? Kirish</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 28,
  },
  header: {
    gap: 10,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9a9a9a',
    fontSize: 14,
    lineHeight: 20,
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
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  error: {
    color: '#ff6155',
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#5B4FE8',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: '#b2a7ff',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});
