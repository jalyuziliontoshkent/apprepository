import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DollarSign,
  LogOut,
  Moon,
  Sun,
  Wallet,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AuthService } from '../../src/modules/auth/AuthService';
import { api } from '../../src/services/apiClient';
import { StateView } from '../../src/components/StateView';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useAppStore } from '../../src/utils/store';
import { useCurrency, useTheme } from '../../src/utils/theme';

const statusCards = [
  { key: 'pending_orders', label: 'Kutilmoqda', tone: 'warning' },
  { key: 'approved_orders', label: 'Tasdiqlangan', tone: 'accent' },
  { key: 'preparing_orders', label: 'Tayyorlanmoqda', tone: 'blue' },
  { key: 'ready_orders', label: 'Tayyor', tone: 'success' },
  { key: 'delivering_orders', label: 'Yetkazilmoqda', tone: 'blue' },
  { key: 'delivered_orders', label: 'Yetkazildi', tone: 'success' },
] as const;

export default function AdminDashboard() {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { currency, formatPrice } = useCurrency();
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const toggleCurrency = useAppStore((state) => state.toggleCurrency);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const [stats, setStats] = useState<Record<string, any>>({});
  const [reports, setReports] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');

      const [statsResult, reportsResult] = await Promise.allSettled([
        api('/statistics', { cacheKey: 'admin-statistics', cacheTtlMs: 20_000 }),
        api('/reports', { cacheKey: 'admin-reports-lite', cacheTtlMs: 20_000 }),
      ]);

      const nextStats =
        statsResult.status === 'fulfilled' && statsResult.value && typeof statsResult.value === 'object'
          ? statsResult.value
          : {};
      const nextReports =
        reportsResult.status === 'fulfilled' && reportsResult.value && typeof reportsResult.value === 'object'
          ? reportsResult.value
          : {};

      setStats(nextStats);
      setReports(nextReports);

      const failedMessage =
        statsResult.status === 'rejected'
          ? statsResult.reason?.message
          : reportsResult.status === 'rejected'
            ? reportsResult.reason?.message
            : '';

      if (failedMessage) {
        setError(failedMessage);
      }
    } catch (err: any) {
      setError(err?.message || 'Dashboard ma`lumotlari yuklanmadi');
      setStats({});
      setReports({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = useCallback(async () => {
    await AuthService.logout();
    router.replace('/');
  }, [router]);

  const daily = Array.isArray(reports?.daily) ? reports.daily : [];
  const topMaterials = Array.isArray(reports?.top_materials) ? reports.top_materials : [];
  const maxDailyOrders = Math.max(...daily.map((item: any) => Number(item?.orders || 0)), 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <StateView title="Dashboard tayyorlanmoqda" message="Statistika yuklanmoqda." loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <LinearGradient colors={['rgba(108,99,255,0.18)', 'transparent']} style={styles.topGlow} />
        <LinearGradient colors={['rgba(89,162,255,0.12)', 'transparent']} style={styles.midGlow} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={c.text}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Assalomu alaykum</Text>
            <Text style={styles.title}>{user?.name || 'Admin'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => void toggleCurrency()}>
              {currency === 'USD' ? <DollarSign size={18} color={c.warning} /> : <Wallet size={18} color={c.warning} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => void toggleTheme()}>
              {theme === 'dark' ? <Sun size={18} color={c.warning} /> : <Moon size={18} color={c.warning} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
              <LogOut size={18} color={c.textSec} />
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient
          colors={['#1B2142', '#1A1E36']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <DollarSign size={18} color={c.accent} />
            </View>
            <Text style={styles.heroLabel}>UMUMIY DAROMAD</Text>
          </View>
          <Text style={styles.heroValue}>{formatPrice(reports?.total_revenue || stats?.total_revenue || 0)}</Text>
          <Text style={styles.heroMeta}>{stats?.total_orders || reports?.total_orders || 0} ta buyurtma</Text>

          <View style={styles.heroStrip}>
            <View style={styles.heroStripBlock}>
              <Text style={styles.heroStripLabel}>HAFTALIK</Text>
              <Text style={styles.heroStripValue}>{formatPrice(reports?.weekly_revenue || 0)}</Text>
            </View>
            <View style={styles.heroStripDivider} />
            <View style={styles.heroStripBlock}>
              <Text style={styles.heroStripLabel}>OYLIK</Text>
              <Text style={styles.heroStripValue}>{formatPrice(reports?.monthly_revenue || 0)}</Text>
            </View>
          </View>
        </LinearGradient>

        {error ? (
          <StateView title="Ma`lumot qisman yuklandi" message={error} actionLabel="Qayta urinish" onAction={fetchData} />
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>BUYURTMA HOLATLARI</Text>
          <View style={styles.statusGrid}>
            {statusCards.map((item) => {
              const tint =
                item.tone === 'warning'
                  ? c.warning
                  : item.tone === 'success'
                    ? c.success
                    : item.tone === 'blue'
                      ? c.blue
                      : c.accent;

              return (
                <View key={item.key} style={styles.statusCard}>
                  <View style={[styles.statusIcon, { backgroundColor: `${tint}1A` }]}>
                    <View style={[styles.statusDot, { backgroundColor: tint }]} />
                  </View>
                  <Text style={styles.statusValue}>{stats?.[item.key] || 0}</Text>
                  <Text style={styles.statusLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.rejectedNote}>Rad etilgan: {stats?.rejected_orders || 0}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>OXIRGI 7 KUN</Text>
          <View style={styles.chartWrap}>
            {(daily.length ? daily : new Array(7).fill(null)).map((item: any, index: number) => {
              const orders = Number(item?.orders || 0);
              const barHeight = Math.max(12, (orders / maxDailyOrders) * 82);

              return (
                <View key={item?.day || index} style={styles.chartColumn}>
                  <Text style={styles.chartValue}>{orders}</Text>
                  <View style={styles.chartRail}>
                    <LinearGradient
                      colors={['#6C63FF', '#8B7DFF']}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[styles.chartBar, { height: orders ? barHeight : 10 }]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{item?.day || '--.--'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>ENG KO'P SOTILGAN MATERIALLAR</Text>
          {topMaterials.length === 0 ? (
            <Text style={styles.emptyText}>Hozircha material statistikasi mavjud emas.</Text>
          ) : (
            topMaterials.slice(0, 5).map((item: any, index: number) => {
              const baseRevenue = Number(topMaterials[0]?.total_price || 1);
              const fillWidth = `${Math.max(6, (Number(item?.total_price || 0) / baseRevenue) * 100)}%` as `${number}%`;

              return (
                <View key={`${item?.name || 'material'}-${index}`} style={styles.materialRow}>
                  <View style={styles.materialLeft}>
                    <View style={styles.materialRank}>
                      <Text style={styles.materialRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.materialCopy}>
                      <Text style={styles.materialName}>{item?.name || 'Material'}</Text>
                      <Text style={styles.materialMeta}>
                        {item?.count || 0} dona · {(Number(item?.total_sqm || 0)).toFixed(1)} kv.m
                      </Text>
                    </View>
                  </View>
                  <View style={styles.materialRight}>
                    <Text style={styles.materialValue}>{formatPrice(Number(item?.total_price || 0))}</Text>
                    <View style={styles.materialTrack}>
                      <View style={[styles.materialFill, { width: fillWidth }]} />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 300,
  },
  midGlow: {
    position: 'absolute',
    top: 260,
    right: -100,
    width: 260,
    height: 260,
    borderRadius: 260,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerCopy: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: c.textTer,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.text,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12141B',
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108,99,255,0.16)',
  },
  heroLabel: {
    color: '#A5A9C4',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 16,
  },
  heroMeta: {
    color: '#8D93AF',
    fontSize: 14,
    marginTop: 4,
  },
  heroStrip: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(10,12,20,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  heroStripBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  heroStripDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroStripLabel: {
    color: '#8D93AF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroStripValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  panel: {
    backgroundColor: '#0E1015',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 16,
  },
  sectionTitle: {
    color: '#A8ADCA',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusCard: {
    width: '48%',
    minHeight: 108,
    backgroundColor: '#13151C',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  statusValue: {
    color: c.text,
    fontSize: 22,
    fontWeight: '800',
  },
  statusLabel: {
    color: c.textTer,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  rejectedNote: {
    color: c.danger,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  chartWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartValue: {
    color: c.textSec,
    fontSize: 12,
    fontWeight: '700',
  },
  chartRail: {
    width: 22,
    height: 88,
    borderRadius: 12,
    justifyContent: 'flex-end',
    backgroundColor: '#151821',
    overflow: 'hidden',
  },
  chartBar: {
    width: '100%',
    borderRadius: 12,
  },
  chartLabel: {
    color: c.textTer,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    color: c.textSec,
    fontSize: 14,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  materialLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  materialRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialRankText: {
    color: c.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  materialCopy: {
    flex: 1,
    gap: 3,
  },
  materialName: {
    color: c.text,
    fontSize: 17,
    fontWeight: '700',
  },
  materialMeta: {
    color: c.textTer,
    fontSize: 13,
    fontWeight: '500',
  },
  materialRight: {
    width: 118,
    alignItems: 'flex-end',
    gap: 8,
  },
  materialValue: {
    color: c.text,
    fontSize: 15,
    fontWeight: '800',
  },
  materialTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  materialFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: c.accent,
  },
});
