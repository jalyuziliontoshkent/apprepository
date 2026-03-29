import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LogOut, Package, Clock, CheckCircle, Truck, XCircle, CreditCard } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, formatPrice, statusColors, statusLabels } from '../../src/utils/theme';

export default function DealerDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const [ordersData, userData] = await Promise.all([
        api('/orders'),
        AsyncStorage.getItem('user'),
      ]);
      setOrders(ordersData);
      if (userData) setUser(JSON.parse(userData));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    router.replace('/');
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} /></SafeAreaView>;
  }

  const pending = orders.filter(o => o.status === 'kutilmoqda').length;
  const preparing = orders.filter(o => o.status === 'tayyorlanmoqda').length;
  const delivered = orders.filter(o => o.status === 'yetkazildi').length;
  const totalSpent = orders.reduce((s, o) => s + (o.total_price || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xush kelibsiz,</Text>
          <Text style={styles.userName}>{user?.name || 'Diler'}</Text>
        </View>
        <TouchableOpacity testID="dealer-logout-btn" onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fff" />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Credit info */}
        <View style={styles.creditCard}>
          <View style={styles.creditRow}>
            <View>
              <Text style={styles.creditLabel}>Kredit Limit</Text>
              <Text style={styles.creditValue}>{formatPrice(user?.credit_limit || 0)}</Text>
            </View>
            <View style={styles.creditDivider} />
            <View>
              <Text style={styles.creditLabel}>Qarz</Text>
              <Text style={[styles.creditValue, (user?.debt || 0) > 0 && styles.debtColor]}>
                {formatPrice(user?.debt || 0)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Buyurtma Holati</Text>
        <View style={styles.statsRow}>
          <View style={styles.miniStat}>
            <Clock size={18} color="#FFB300" strokeWidth={1.5} />
            <Text style={styles.miniStatValue}>{pending}</Text>
            <Text style={styles.miniStatLabel}>Kutilmoqda</Text>
          </View>
          <View style={styles.miniStat}>
            <Package size={18} color="#448AFF" strokeWidth={1.5} />
            <Text style={styles.miniStatValue}>{preparing}</Text>
            <Text style={styles.miniStatLabel}>Tayyorlanmoqda</Text>
          </View>
          <View style={styles.miniStat}>
            <Truck size={18} color="#00E676" strokeWidth={1.5} />
            <Text style={styles.miniStatValue}>{delivered}</Text>
            <Text style={styles.miniStatLabel}>Yetkazildi</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>So'nggi Buyurtmalar</Text>
        {orders.slice(0, 5).map(order => (
          <View key={order.id} style={styles.orderCard} testID={`dealer-order-${order.id}`}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('uz-UZ')}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (statusColors[order.status] || '#fff') + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[order.status] }]} />
                <Text style={[styles.statusText, { color: statusColors[order.status] }]}>{statusLabels[order.status]}</Text>
              </View>
            </View>
            <View style={styles.orderFooter}>
              <Text style={styles.orderItems}>{order.items?.length || 0} ta mahsulot | {order.total_sqm} kv.m</Text>
              <Text style={styles.orderPrice}>{formatPrice(order.total_price)}</Text>
            </View>
          </View>
        ))}
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
  creditCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', padding: 24, marginBottom: 24,
  },
  creditRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  creditDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  creditLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  creditValue: { fontSize: 18, fontWeight: '500', color: '#fff' },
  debtColor: { color: '#FF5252' },
  sectionTitle: {
    fontSize: 12, color: colors.textMuted, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 12,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  miniStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', padding: 16, alignItems: 'center', gap: 6,
  },
  miniStatValue: { fontSize: 24, fontWeight: '300', color: '#fff' },
  miniStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', padding: 16, marginBottom: 10,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  orderItems: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  orderPrice: { fontSize: 15, fontWeight: '500', color: '#fff' },
});
