import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, Phone, Hash } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/services/apiClient';
import { useTheme, useCurrency, statusLabels, getStatusColor } from '../../src/utils/theme';
import { StateView } from '../../src/components/StateView';
import { SectionCard } from '../../src/components/SectionCard';

export default function DealerOrders() {
  const c = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      setError('');
      setOrders(await api('/orders', { cacheKey: 'dealer-orders', cacheTtlMs: 20000 }));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Buyurtmalar yuklanmadi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const allStatuses = ['kutilmoqda', 'tasdiqlangan', 'tayyorlanmoqda', 'tayyor', 'yetkazilmoqda', 'yetkazildi'];
  const filteredOrders = orders.filter((order) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(order.order_code || '').toLowerCase().includes(q) ||
      String(statusLabels[order.status] || order.status || '').toLowerCase().includes(q)
    );
  });

  const exportOrderPdf = async (order: any) => {
    const items = (order.items || [])
      .map((item: any) => `<li>${item.material_name} - ${item.width}m x ${item.height}m</li>`)
      .join('');
    const html = `
      <html><body>
      <h1>Lion Blinds - Order ${order.order_code}</h1>
      <p>Status: ${statusLabels[order.status] || order.status}</p>
      <p>Created: ${new Date(order.created_at).toLocaleString('uz-UZ')}</p>
      <ul>${items}</ul>
      <p>Total SQM: ${order.total_sqm}</p>
      <p>Total Price: ${formatPrice(order.total_price)}</p>
      </body></html>
    `;
    const file = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
  };

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Buyurtmalarim</Text>
      <View style={s.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buyurtma qidirish..."
          placeholderTextColor={c.textTer}
          style={s.searchInput}
        />
      </View>
      {loading ? (
        <View style={s.centerWrap}>
          <StateView title="Buyurtmalar yuklanmoqda" message="Holatlar va tafsilotlar tayyorlanmoqda." loading />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={c.text} />}
          contentContainerStyle={s.scrollContent}
        >
          {error ? (
            <StateView title="Yuklashda xatolik" message={error} actionLabel="Qayta urinish" onAction={fetchOrders} />
          ) : filteredOrders.length === 0 ? (
            <StateView title="Buyurtmalar topilmadi" message="Qidiruvni tozalang yoki yangi buyurtma yarating." />
          ) : (
            <SectionCard title="Buyurtmalar ro'yxati" subtitle={`${filteredOrders.length} ta natija`}>
              {filteredOrders.map((order) => (
                <View key={order.id} style={s.orderCard} testID={`my-order-${order.id}`}>
                  <View style={s.orderHeader}>
                    <View style={s.codeSection}>
                      <Hash size={13} color={c.accent} />
                      <Text style={s.codeText}>{order.order_code}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: `${getStatusColor(order.status, c)}18` }]}>
                      <View style={[s.statusDot, { backgroundColor: getStatusColor(order.status, c) }]} />
                      <Text style={[s.statusText, { color: getStatusColor(order.status, c) }]}>{statusLabels[order.status] || order.status}</Text>
                    </View>
                  </View>
                  <Text style={s.orderDate}>{new Date(order.created_at).toLocaleString('uz-UZ')}</Text>
                  <View style={s.tracker}>
                    {allStatuses.map((st, i) => {
                      const idx = allStatuses.indexOf(order.status);
                      const active = i <= idx && order.status !== 'rad_etilgan';
                      return (
                        <View key={st} style={s.trackerStep}>
                          <View style={[s.trackerDot, active && { backgroundColor: c.accent }]} />
                          {i < allStatuses.length - 1 && <View style={[s.trackerLine, active && { backgroundColor: `${c.accent}50` }]} />}
                        </View>
                      );
                    })}
                  </View>
                  {order.status === 'rad_etilgan' && order.rejection_reason ? (
                    <View style={s.rejectBox}><Text style={s.rejectText}>Sabab: {order.rejection_reason}</Text></View>
                  ) : null}
                  {order.delivery_info && (
                    <View style={s.deliveryCard}>
                      <Truck size={16} color={c.blue} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.deliveryTitle}>Yetkazish</Text>
                        <Text style={s.deliveryDriver}>{order.delivery_info.driver_name}</Text>
                        {order.delivery_info.plate_number ? <Text style={s.deliveryPlate}>{order.delivery_info.plate_number}</Text> : null}
                      </View>
                      <View style={s.callBtn}>
                        <Phone size={13} color="#fff" />
                        <Text style={s.callText}>{order.delivery_info.driver_phone}</Text>
                      </View>
                    </View>
                  )}
                  {order.items?.map((item: any, i: number) => (
                    <View key={i} style={s.itemRow}>
                      <Text style={s.itemName}>{item.material_name}</Text>
                      <Text style={s.itemDetail}>{item.width}m x {item.height}m = {item.sqm} kv.m</Text>
                    </View>
                  ))}
                  <View style={s.orderFooter}>
                    <Text style={s.orderTotal}>{order.total_sqm} kv.m</Text>
                    <Text style={s.orderPrice}>{formatPrice(order.total_price)}</Text>
                  </View>
                  <TouchableOpacity style={s.pdfBtn} onPress={() => exportOrderPdf(order)}>
                    <Text style={s.pdfBtnText}>PDF eksport</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </SectionCard>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  centerWrap: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: c.text, paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  searchWrap: { paddingHorizontal: 24, paddingTop: 10 },
  searchInput: {
    height: 48,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    color: c.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  orderCard: { backgroundColor: 'transparent', borderRadius: 22, borderWidth: 1, borderColor: c.cardBorder, padding: 18, marginBottom: 14 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeSection: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  codeText: { fontSize: 14, fontWeight: '800', color: c.accent, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderDate: { fontSize: 12, color: c.textTer, marginTop: 8 },
  tracker: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 4 },
  trackerStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  trackerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.cardBorder },
  trackerLine: { flex: 1, height: 2, backgroundColor: c.cardBorder, marginHorizontal: 2 },
  rejectBox: { backgroundColor: c.dangerSoft, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: `${c.danger}30` },
  rejectText: { fontSize: 12, color: c.danger },
  deliveryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.blueSoft, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: `${c.blue}25` },
  deliveryTitle: { fontSize: 10, color: c.blue, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  deliveryDriver: { fontSize: 14, fontWeight: '600', color: c.text },
  deliveryPlate: { fontSize: 12, color: c.textSec, marginTop: 1 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  callText: { fontSize: 11, color: '#fff' },
  itemRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
  itemName: { fontSize: 14, fontWeight: '600', color: c.text },
  itemDetail: { fontSize: 12, color: c.textSec, marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.cardBorder },
  orderTotal: { fontSize: 13, color: c.textSec },
  orderPrice: { fontSize: 18, fontWeight: '800', color: c.text },
  pdfBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: c.accentSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  pdfBtnText: { color: c.accent, fontWeight: '700', fontSize: 12 },
});
