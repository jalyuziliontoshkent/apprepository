import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LogOut, Package, Users, Boxes, TrendingUp, Clock, CheckCircle, Truck, XCircle } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, formatPrice } from '../../src/utils/theme';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const data = await api('/statistics');
      setStats(data);
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) setUserName(JSON.parse(userStr).name || 'Admin');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    router.replace('/');
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const statCards = [
    { icon: Package, label: 'Buyurtmalar', value: stats?.total_orders || 0, color: '#fff' },
    { icon: TrendingUp, label: 'Daromad', value: formatPrice(stats?.total_revenue || 0), color: '#00E676' },
    { icon: Clock, label: 'Kutilmoqda', value: stats?.pending_orders || 0, color: '#FFB300' },
    { icon: CheckCircle, label: 'Tasdiqlangan', value: stats?.approved_orders || 0, color: '#00C853' },
    { icon: Truck, label: 'Yetkazildi', value: stats?.delivered_orders || 0, color: '#448AFF' },
    { icon: XCircle, label: 'Rad etilgan', value: stats?.rejected_orders || 0, color: '#FF5252' },
    { icon: Users, label: 'Dilerlar', value: stats?.total_dealers || 0, color: '#fff' },
    { icon: Boxes, label: 'Materiallar', value: stats?.total_materials || 0, color: '#fff' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xush kelibsiz,</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity testID="admin-logout-btn" onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>Statistika</Text>
        <View style={styles.statsGrid}>
          {statCards.map((card, i) => (
            <View key={i} style={styles.statCard} testID={`stat-card-${i}`}>
              <card.icon size={20} color={card.color} strokeWidth={1.5} />
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  greeting: { fontSize: 14, color: colors.textSecondary },
  userName: { fontSize: 24, fontWeight: '300', color: '#fff', letterSpacing: -0.5 },
  logoutBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 12, color: colors.textMuted, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 16, marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  statCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 20, gap: 8,
  },
  statValue: {
    fontSize: 28, fontWeight: '300', color: '#fff', letterSpacing: -1, marginTop: 4,
  },
  statLabel: { fontSize: 13, color: colors.textSecondary },
});
