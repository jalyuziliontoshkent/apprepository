import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CreditCard, LogOut, MessageCircle, Package, ShoppingBag } from 'lucide-react-native';
import { api } from '../../src/services/apiClient';
import { SectionCard } from '../../src/components/SectionCard';
import { StateView } from '../../src/components/StateView';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getStatusColor, statusLabels, useCurrency, useTheme } from '../../src/utils/theme';

export default function DealerDashboard() {
  const c = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const { formatPrice } = useCurrency();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const data = await api('/orders', { cacheKey: 'dealer-orders-dashboard', cacheTtlMs: 15000 });
      setOrders(data);
    } catch (err: any) {
      setError(err?.message || 'Buyurtmalar yuklanmadi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <StateView title="Panel tayyorlanmoqda" message="Buyurtmalar va hisoblar yuklanmoqda." loading />
        </View>
      </SafeAreaView>
    );
  }

  const pending = orders.filter((item) => item.status === 'kutilmoqda').length;
  const inProgress = orders.filter((item) => ['tasdiqlangan', 'tayyorlanmoqda', 'tayyor'].includes(item.status)).length;
  const delivered = orders.filter((item) => item.status === 'yetkazildi').length;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>Xush kelibsiz</Text>
          <Text style={s.title}>{user?.name || 'Diler'}</Text>
        </View>
        <TouchableOpacity style={s.iconButton} onPress={handleLogout}>
          <LogOut size={20} color={c.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={c.text} />}
      >
        <SectionCard style={s.hero}>
          <Text style={s.heroLabel}>Hisob holati</Text>
          <Text style={s.heroValue}>{formatPrice(user?.credit_limit || 0)}</Text>
          <Text style={s.heroMeta}>Qarz: {formatPrice(user?.debt || 0)}</Text>
          <View style={s.heroPill}>
            <CreditCard size={16} color={c.text} />
            <Text style={s.heroPillText}>Buyurtmalar kelganda statuslar shu yerdan kuzatiladi</Text>
          </View>
        </SectionCard>

        <View style={s.quickGrid}>
        <TouchableOpacity style={[s.quickCard, s.quickCardPrimary]} onPress={() => router.push('/dealer/new-order' as any)}>
            <View style={s.quickIconPrimary}>
              <ShoppingBag size={22} color="#FFFFFF" />
            </View>
            <Text style={s.quickLabelPrimary}>Yangi buyurtma</Text>
          </TouchableOpacity>

        <TouchableOpacity style={s.quickCard} onPress={() => router.push('/dealer/orders' as any)}>
            <View style={s.quickIcon}>
              <Package size={22} color={c.text} />
            </View>
            <Text style={s.quickLabel}>Buyurtmalar</Text>
          </TouchableOpacity>

        <TouchableOpacity style={s.quickCard} onPress={() => router.push('/dealer/orders' as any)}>
            <View style={s.quickIcon}>
              <CreditCard size={22} color={c.text} />
            </View>
            <Text style={s.quickLabel}>Hisobot</Text>
          </TouchableOpacity>

        <TouchableOpacity style={s.quickCard} onPress={() => router.push('/dealer/chat' as any)}>
            <View style={s.quickIcon}>
              <MessageCircle size={22} color={c.text} />
            </View>
            <Text style={s.quickLabel}>Chat</Text>
          </TouchableOpacity>
        </View>

        <SectionCard title="Holatlar" subtitle="Tez ko`rinish">
          <View style={s.statusRow}>
            {[
              { label: 'Kutilmoqda', value: pending },
              { label: 'Jarayonda', value: inProgress },
              { label: 'Yetkazildi', value: delivered },
            ].map((item) => (
              <View key={item.label} style={s.statusCard}>
                <Text style={s.statusValue}>{item.value}</Text>
                <Text style={s.statusLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard title="So`nggi buyurtmalar" subtitle="Oxirgi yuborilgan buyurtmalar">
          {error ? (
            <StateView title="Yuklashda xatolik" message={error} actionLabel="Qayta urinish" onAction={fetchData} />
          ) : orders.length === 0 ? (
          <StateView title="Buyurtmalar hali yo`q" message="Birinchi buyurtmani yuboring, keyin statuslar shu yerda chiqadi." actionLabel="Buyurtma yaratish" onAction={() => router.push('/dealer/new-order' as any)} />
          ) : (
            orders.slice(0, 3).map((order) => (
              <View key={order.id} style={s.orderCard}>
                <View style={s.orderTop}>
                  <Text style={s.orderCode}>{order.order_code}</Text>
                  <View style={[s.statusBadge, { backgroundColor: `${getStatusColor(order.status, c)}20` }]}>
                    <Text style={[s.statusBadgeText, { color: getStatusColor(order.status, c) }]}>{statusLabels[order.status]}</Text>
                  </View>
                </View>
                <Text style={s.orderMeta}>{order.items?.length || 0} ta mahsulot, {order.total_sqm} kv.m</Text>
                <Text style={s.orderPrice}>{formatPrice(order.total_price)}</Text>
              </View>
            ))
          )}
        </SectionCard>

        <View style={s.bottomGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  centered: { flex: 1, paddingHorizontal: 22, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 10,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: { fontSize: 32, fontWeight: '900', color: c.text, marginTop: 4 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 110, gap: 14 },
  hero: { padding: 22 },
  heroLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: { fontSize: 34, fontWeight: '900', color: c.text, marginTop: 12 },
  heroMeta: { fontSize: 15, color: c.textSec, marginTop: 8 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroPillText: { flex: 1, fontSize: 13, color: c.textSec },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: {
    width: '47%',
    minHeight: 118,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 26,
    padding: 18,
    justifyContent: 'space-between',
  },
  quickCardPrimary: {
    backgroundColor: c.accent,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  quickIconPrimary: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  quickLabel: { fontSize: 16, fontWeight: '800', color: c.text },
  quickLabelPrimary: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.cardBorder,
    gap: 6,
  },
  statusValue: { fontSize: 28, fontWeight: '900', color: c.text },
  statusLabel: { fontSize: 11, fontWeight: '700', color: c.textSec },
  orderCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.inputBg,
    padding: 16,
    marginBottom: 10,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  orderCode: { fontSize: 14, fontWeight: '900', color: c.text, letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  orderMeta: { fontSize: 13, color: c.textSec, marginTop: 10 },
  orderPrice: { fontSize: 20, fontWeight: '900', color: c.text, marginTop: 8 },
  bottomGap: { height: 10 },
});
