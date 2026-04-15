import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, Boxes, LogOut, Package, Users, Wrench } from 'lucide-react-native';
import { api } from '../../src/services/apiClient';
import { SectionCard } from '../../src/components/SectionCard';
import { StateView } from '../../src/components/StateView';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useCurrency, useTheme } from '../../src/utils/theme';

const quickLinks = [
  { key: 'dealers', label: 'Dillerlar', icon: Users, route: '/admin/dealers' as const },
  { key: 'orders', label: 'Buyurtmalar', icon: Package, route: '/admin/orders' as const },
  { key: 'workers', label: 'Ishchilar', icon: Wrench, route: '/admin/workers' as const },
  { key: 'inventory', label: 'Ombor', icon: Boxes, route: '/admin/inventory' as const },
];

export default function AdminDashboard() {
  const c = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const { formatPrice } = useCurrency();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const [statsData, reportsData, lowStockData] = await Promise.all([
        api('/statistics', { cacheKey: 'admin-statistics', cacheTtlMs: 20000 }),
        api('/reports', { cacheKey: 'admin-reports-lite', cacheTtlMs: 20000 }),
        api('/alerts/low-stock', { cacheKey: 'admin-low-stock-lite', cacheTtlMs: 12000 }),
      ]);
      setStats(statsData);
      setReports(reportsData);
      setLowStock(lowStockData || []);
    } catch (err: any) {
      setError(err?.message || 'Dashboard yuklanmadi');
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
          <StateView title="Admin panel tayyorlanmoqda" message="Statistika va modullar yuklanmoqda." loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>Xush kelibsiz</Text>
          <Text style={s.title}>{user?.name || 'Admin'}</Text>
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
          <Text style={s.heroLabel}>Bugungi boshqaruv</Text>
          <Text style={s.heroValue}>{formatPrice(reports?.total_revenue || 0)}</Text>
          <Text style={s.heroMeta}>
            {stats?.total_orders || 0} ta buyurtma, {stats?.total_dealers || 0} ta diler, {stats?.total_workers || 0} ta ishchi
          </Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{stats?.pending_orders || 0}</Text>
              <Text style={s.heroStatLabel}>Kutilmoqda</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{stats?.ready_orders || 0}</Text>
              <Text style={s.heroStatLabel}>Tayyor</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{stats?.delivered_orders || 0}</Text>
              <Text style={s.heroStatLabel}>Yetkazildi</Text>
            </View>
          </View>
        </SectionCard>

        <View style={s.quickGrid}>
          {quickLinks.map((item) => (
            <TouchableOpacity key={item.key} style={s.quickCard} onPress={() => router.push(item.route as any)}>
              <View style={s.quickIcon}>
                <item.icon size={22} color={c.text} />
              </View>
              <Text style={s.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <StateView title="Yuklashda xatolik" message={error} actionLabel="Qayta urinish" onAction={fetchData} />
        ) : (
          <>
            <SectionCard title="Jarayon" subtitle="Asosiy holatlar">
              <View style={s.statusGrid}>
                {[
                  { label: 'Tasdiqlangan', value: stats?.approved_orders || 0 },
                  { label: 'Tayyorlanmoqda', value: stats?.preparing_orders || 0 },
                  { label: 'Yetkazilmoqda', value: stats?.delivering_orders || 0 },
                  { label: 'Rad etilgan', value: stats?.rejected_orders || 0 },
                ].map((item) => (
                  <View key={item.label} style={s.statusCard}>
                    <Text style={s.statusValue}>{item.value}</Text>
                    <Text style={s.statusLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </SectionCard>

            <SectionCard
              title="Kam qolgan mahsulotlar"
              subtitle="Omborni tez tekshirish"
              right={<AlertTriangle size={18} color={lowStock.length ? c.warning : c.textTer} />}
            >
              {lowStock.length === 0 ? (
                <Text style={s.emptyText}>Hozircha kritik qoldiq yo`q.</Text>
              ) : (
                lowStock.slice(0, 4).map((item) => (
                  <View key={item.id || item.name} style={s.stockRow}>
                    <Text style={s.stockName}>{item.name}</Text>
                    <Text style={s.stockQty}>{item.stock_quantity} {item.unit}</Text>
                  </View>
                ))
              )}
            </SectionCard>
          </>
        )}

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
  heroValue: { fontSize: 34, fontWeight: '900', color: c.text, marginTop: 10 },
  heroMeta: { fontSize: 14, color: c.textSec, marginTop: 8, lineHeight: 21 },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroStatValue: { fontSize: 24, fontWeight: '800', color: c.text },
  heroStatLabel: { fontSize: 11, color: c.textSec, textTransform: 'uppercase', letterSpacing: 0.6 },
  heroDivider: { width: 1, height: 34, backgroundColor: c.cardBorder },
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
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  quickLabel: { fontSize: 16, fontWeight: '800', color: c.text },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusCard: {
    width: '47%',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.inputBg,
    padding: 16,
    gap: 6,
  },
  statusValue: { fontSize: 28, fontWeight: '900', color: c.text },
  statusLabel: { fontSize: 12, fontWeight: '700', color: c.textSec },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  stockName: { fontSize: 15, fontWeight: '700', color: c.text },
  stockQty: { fontSize: 14, fontWeight: '700', color: c.warning },
  emptyText: { fontSize: 14, color: c.textSec },
  bottomGap: { height: 10 },
});
