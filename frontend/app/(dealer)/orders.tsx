import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, statusColors, statusLabels, formatPrice } from '../../src/utils/theme';

export default function DealerOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try { setOrders(await api('/orders')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Mening Buyurtmalarim</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor="#fff" />}
          contentContainerStyle={styles.scrollContent}
        >
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>Buyurtmalar yo'q</Text>
              <Text style={styles.emptySubText}>Yangi buyurtma yaratish uchun "Buyurtma" tabini bosing</Text>
            </View>
          ) : orders.map(order => (
            <View key={order.id} style={styles.orderCard} testID={`my-order-${order.id}`}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('uz-UZ')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (statusColors[order.status] || '#fff') + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColors[order.status] }]} />
                  <Text style={[styles.statusText, { color: statusColors[order.status] }]}>{statusLabels[order.status]}</Text>
                </View>
              </View>

              {/* Status tracker */}
              <View style={styles.tracker}>
                {['kutilmoqda', 'tasdiqlangan', 'tayyorlanmoqda', 'yetkazildi'].map((s, i) => {
                  const statuses = ['kutilmoqda', 'tasdiqlangan', 'tayyorlanmoqda', 'yetkazildi'];
                  const currentIdx = statuses.indexOf(order.status);
                  const isActive = i <= currentIdx && order.status !== 'rad_etilgan';
                  return (
                    <View key={s} style={styles.trackerStep}>
                      <View style={[styles.trackerDot, isActive && styles.trackerDotActive]} />
                      {i < 3 && <View style={[styles.trackerLine, isActive && styles.trackerLineActive]} />}
                    </View>
                  );
                })}
              </View>

              {order.status === 'rad_etilgan' && order.rejection_reason ? (
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionText}>Rad etish sababi: {order.rejection_reason}</Text>
                </View>
              ) : null}

              {/* Items */}
              {order.items?.map((item: any, i: number) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.material_name}</Text>
                  <Text style={styles.itemDetail}>{item.width}m × {item.height}m = {item.sqm} kv.m</Text>
                </View>
              ))}

              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>Jami: {order.total_sqm} kv.m</Text>
                <Text style={styles.orderPrice}>{formatPrice(order.total_price)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '300', color: '#fff', paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  emptySubText: { fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', maxWidth: 250 },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', padding: 18, marginBottom: 14,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  tracker: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 8 },
  trackerStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  trackerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)' },
  trackerDotActive: { backgroundColor: '#fff' },
  trackerLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 2 },
  trackerLineActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  rejectionBox: {
    backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 12, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)',
  },
  rejectionText: { fontSize: 12, color: '#FF5252' },
  itemRow: {
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  itemName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  itemDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  orderTotal: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  orderPrice: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
