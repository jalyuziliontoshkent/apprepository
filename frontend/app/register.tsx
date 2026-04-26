import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Ro'yxatdan o'tish yopilgan</Text>
          <Text style={styles.body}>
            Bu ilova faqat tasdiqlangan xodim va hamkorlar uchun. Yangi akkauntlar faqat administrator
            tomonidan yaratiladi.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/' as never)}>
            <Text style={styles.buttonText}>Kirish sahifasiga qaytish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#101010',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#202020',
    padding: 24,
    gap: 14,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: '#b0b0b0',
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#5B4FE8',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
