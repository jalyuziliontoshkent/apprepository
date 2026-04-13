import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { LogOut, Clock, Zap, Truck, CreditCard, Hash, ShoppingBag, PackageSearch } from 'lucide-react-native';
import { api } from '../../src/services/apiClient';
import { useTheme, useCurrency, getStatusColor, statusLabels } from '../../src/utils/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { SectionCard } from '../../src/components/SectionCard';
import { StateView } from '../../src/components/StateView';
import { Button } from '../../src/components/Button';

export default function DealerDashboard() {
  const c = useTheme();
  const authUser = useAuthStore((s) => s.user);
  const authLogout = useAuthStore((s) => s.logout);
  const s = useMemo(() => createStyles(c), [c]);
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const ordersData = await api('/orders', { cacheKey: 'dealer-orders', cacheTtlMs: 20000 });
      setOrders(ordersData);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Buyurtmalar yuklanmadi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await authLogout();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}>
        <View style={s.centerWrap}>
          <StateView title="Ma'lumotlar tayyorlanmoqda" message="Hisob va buyurtmalar yuklanmoqda." loading />
        </View>
      </SafeAreaView>
    );
  }

  const pending = orders.filter((o) => o.status === 'kutilmoqda').length;
  const preparing = orders.filter((o) => ['tayyorlanmoqda', 'tayyor'].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === 'yetkazildi').length;

  return (
    <SafeAreaView style={[s.c, { backgroundColor: c.bg }]}>
      <View style={s.header}>
        <View>
          <Text style={s.hi}>Xush kelibsiz</Text>
          <Text style={s.name}>{authUser?.name || 'Diler'}</Text>
        </View>
        <TouchableOpacity testID="dealer-logout-btn" onPress={handleLogout} style={s.logoutBtn}>
          <LogOut size={20} color={c.textSec} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={c.text} />}
        contentContainerStyle={s.scroll}
      >
        <View style={s.actionRow}>
          <Button
            title="Yangi buyurtma"
            onPress={() => router.push('/(dealer)/new-order')}
            leftIcon={<ShoppingBag size={16} color="#fff" />}
            style={s.actionBtn}
          />
          <Button
            title="Buyurtmalar"
            variant="secondary"
            onPress={() => router.push('/(dealer)/orders')}
            leftIcon={<PackageSearch size={16} color={c.text} />}
            style={s.actionBtn}
          />
        </View>

        <View style={s.creditWrap}>
          <LinearGradient colors={['#1a1a2e', '#16213e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.credit}>
            <View style={s.creditTop}>
              <CreditCard size={18} color="rgba(255,255,255,0.4)" />
              <Text style={s.creditTopLabel}>Hisobim</Text>
            </View>
            <View style={s.creditRow}>
              <View style={s.creditItem}>
                <Text style={s.creditLabel}>Kredit limit</Text>
                <Text style={s.creditVal}>{formatPrice(authUser?.credit_limit || 0)}</Text>
              </View>
              <View style={s.creditDiv} />
              <View style={s.creditItem}>
                <Text style={s.creditLabel}>Qarz</Text>
                <Text style={[s.creditVal, (authUser?.debt || 0) > 0 && { color: c.danger }]}>
                  {formatPrice(authUser?.debt || 0)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <SectionCard title="Holatlar" subtitle="Buyurtmalarning joriy ko'rinishi" style={s.sectionSpacing}>
          <View style={s.statusRow}>
            {[
              { icon: Clock, val: pending, label: 'Kutilmoqda', color: c.warning },
              { icon: Zap, val: preparing, label: 'Jarayonda', color: c.blue },
              { icon: Truck, val: delivered, label: 'Yetkazildi', color: c.success },
            ].map((item, i) => (
              <View key={i} style={s.statusCard}>
                <View style={[s.statusIcon, { backgroundColor: `${item.color}18` }]}>
                  <item.icon size={16} color={item.color} />
                </View>
                <Text style={s.statusVal}>{item.val}</Text>
                <Text style={s.statusLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="So'nggi buyurtmalar" subtitle="Oxirgi 5 ta eng muhim buyurtma">
          {error ? (
            <StateView title="Yuklashda xatolik" message={error} actionLabel="Qayta urinish" onAction={fetchData} />
          ) : orders.length === 0 ? (
            <StateView
              title="Buyurtmalar hali yo'q"
              message="Birinchi buyurtmani yarating, keyin holatlar shu yerda ko‘rinadi."
              actionLabel="Buyurtma yaratish"
              onAction={() => router.push('/(dealer)/new-order')}
            />
          ) : (
            orders.slice(0, 5).map((order) => (
              <View key={order.id} style={s.orderCard} testID={`dealer-order-${order.id}`}>
                <View style={s.orderHead}>
                  <View style={s.codeBadge}>
                    <Hash size={11} color={c.accent} />
                    <Text style={s.codeText}>{order.order_code}</Text>
                  </View>
                  <View style={[s.sBadge, { backgroundColor: `${getStatusColor(order.status, c)}18` }]}>
                    <View style={[s.sDot, { backgroundColor: getStatusColor(order.status, c) }]} />
                    <Text style={[s.sText, { color: getStatusColor(order.status, c) }]}>{statusLabels[order.status]}</Text>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.itemsPreview}>
                  {order.items?.map((item: any, i: number) => (
                    <View key={i} style={s.itemThumb}>
                      <Text style={s.itemThumbName} numberOfLines={1}>{item.material_name}</Text>
                      <Text style={s.itemThumbSize}>{item.width}x{item.height}m</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={s.orderFoot}>
                  <Text style={s.orderSqm}>{order.total_sqm} kv.m</Text>
                  <Text style={s.orderPrice}>{formatPrice(order.total_price)}</Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  c: { flex: 1 },
  centerWrap: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  hi: { fontSize: 13, color: c.textSec, fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.cardBorder },
  scroll: { paddingHorizontal: 24, paddingBottom: 100 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1 },
  creditWrap: { marginBottom: 16, borderRadius: 24, overflow: 'hidden' },
  credit: { padding: 24, borderRadius: 24 },
  creditTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  creditTopLabel: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  creditRow: { flexDirection: 'row', alignItems: 'center' },
  creditItem: { flex: 1, alignItems: 'center' },
  creditDiv: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.08)' },
  creditLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: '600' },
  creditVal: { fontSize: 24, fontWeight: '800', color: '#fff' },
  sectionSpacing: { marginBottom: 16 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusCard: { flex: 1, backgroundColor: c.inputBg, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: c.cardBorder, gap: 6 },
  statusIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusVal: { fontSize: 24, fontWeight: '800', color: c.text },
  statusLabel: { fontSize: 11, color: c.textSec, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  orderCard: { backgroundColor: 'transparent', borderRadius: 20, borderWidth: 1, borderColor: c.cardBorder, padding: 16, marginBottom: 10 },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  codeText: { fontSize: 12, fontWeight: '800', color: c.accent, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  sBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  sDot: { width: 5, height: 5, borderRadius: 2.5 },
  sText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemsPreview: { marginTop: 12 },
  itemThumb: { backgroundColor: c.inputBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: c.cardBorder },
  itemThumbName: { fontSize: 12, fontWeight: '600', color: c.text },
  itemThumbSize: { fontSize: 10, color: c.textTer, marginTop: 1 },
  orderFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.cardBorder },
  orderSqm: { fontSize: 13, color: c.textSec },
  orderPrice: { fontSize: 17, fontWeight: '800', color: c.text },
});
