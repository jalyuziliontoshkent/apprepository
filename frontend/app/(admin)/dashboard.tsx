import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LogOut, TrendingUp, Clock, CheckCircle, Truck, XCircle, Zap, Users, Boxes, Wrench, Settings, X, BarChart3, AlertTriangle, Medal, Calendar } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, formatPrice } from '../../src/utils/theme';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', current_password: '', password: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const [statsData, reportsData, lowStockData, userStr] = await Promise.all([
        api('/statistics'),
        api('/reports'),
        api('/alerts/low-stock'),
        AsyncStorage.getItem('user'),
      ]);
      setStats(statsData);
      setReports(reportsData);
      setLowStock(lowStockData || []);
      if (userStr) {
        const u = JSON.parse(userStr);
        setUserName(u.name || 'Admin');
        setUserEmail(u.email || '');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    router.replace('/');
  };

  const openProfile = () => {
    setProfileForm({ email: userEmail, current_password: '', password: '' });
    setProfileMsg(''); setProfileErr('');
    setShowProfile(true);
  };

  const saveProfile = async () => {
    if (!profileForm.current_password) { setProfileErr('Joriy parolni kiriting'); return; }
    setProfileLoading(true); setProfileErr(''); setProfileMsg('');
    try {
      const res = await api('/auth/profile', { method: 'PUT', body: JSON.stringify(profileForm) });
      await AsyncStorage.setItem('token', res.token);
      await AsyncStorage.setItem('user', JSON.stringify(res.user));
      setUserName(res.user.name || 'Admin');
      setUserEmail(res.user.email || '');
      setProfileMsg('Profil yangilandi!');
      setProfileForm({ ...profileForm, current_password: '', password: '' });
    } catch (e: any) { setProfileErr(e.message || 'Xatolik'); }
    finally { setProfileLoading(false); }
  };

  if (loading) return <SafeAreaView style={s.c}><ActivityIndicator size="large" color={colors.accent} style={{ flex: 1 }} /></SafeAreaView>;

  const statCards = [
    { icon: Clock, val: stats?.pending_orders || 0, label: 'Kutilmoqda', color: colors.warning },
    { icon: Zap, val: stats?.preparing_orders || 0, label: 'Tayyorlanmoqda', color: colors.blue },
    { icon: CheckCircle, val: (stats?.ready_orders || 0), label: 'Tayyor', color: colors.success },
    { icon: Truck, val: stats?.delivered_orders || 0, label: 'Yetkazildi', color: '#00C853' },
  ];

  // Max revenue for bar chart
  const maxRevenue = reports?.daily ? Math.max(...reports.daily.map((d: any) => d.revenue), 1) : 1;

  return (
    <SafeAreaView style={s.c}>
      <View style={s.header}>
        <View>
          <Text style={s.hi}>Xush kelibsiz</Text>
          <Text style={s.name}>{userName}</Text>
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity onPress={openProfile} style={s.headerBtn}>
            <Settings size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={s.headerBtn}>
            <LogOut size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fff" />} contentContainerStyle={s.scroll}>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <View style={s.alertBanner}>
            <View style={s.alertHeader}>
              <AlertTriangle size={16} color="#FF5252" />
              <Text style={s.alertTitle}>Material kam qoldi!</Text>
            </View>
            {lowStock.map((m, i) => (
              <View key={i} style={s.alertItem}>
                <Text style={s.alertItemName}>{m.name}</Text>
                <Text style={[s.alertItemStock, m.stock_quantity < 3 && { color: '#FF5252' }]}>
                  {m.stock_quantity} {m.unit || 'kv.m'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Revenue Cards */}
        <View style={s.revenueRow}>
          <View style={s.revenueCard}>
            <LinearGradient colors={['#6C63FF', '#4A43CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.revenueGrad}>
              <Calendar size={16} color="rgba(255,255,255,0.6)" />
              <Text style={s.revenueLabel}>Haftalik</Text>
              <Text style={s.revenueVal}>{formatPrice(reports?.weekly_revenue || 0)}</Text>
              <Text style={s.revenueSub}>{reports?.weekly_orders || 0} buyurtma</Text>
            </LinearGradient>
          </View>
          <View style={s.revenueCard}>
            <LinearGradient colors={['#00C853', '#009624']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.revenueGrad}>
              <TrendingUp size={16} color="rgba(255,255,255,0.6)" />
              <Text style={s.revenueLabel}>Oylik</Text>
              <Text style={s.revenueVal}>{formatPrice(reports?.monthly_revenue || 0)}</Text>
              <Text style={s.revenueSub}>{reports?.monthly_orders || 0} buyurtma</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Status Grid */}
        <View style={s.grid}>
          {statCards.map((c, i) => (
            <View key={i} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: c.color + '18' }]}>
                <c.icon size={18} color={c.color} />
              </View>
              <Text style={s.statVal}>{c.val}</Text>
              <Text style={s.statLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* Mini Bar Chart - Last 7 days */}
        {reports?.daily && (
          <View style={s.chartSection}>
            <View style={s.sectionHeader}>
              <BarChart3 size={16} color={colors.accent} />
              <Text style={s.sectionTitle}>Oxirgi 7 kun</Text>
            </View>
            <View style={s.chartRow}>
              {reports.daily.map((d: any, i: number) => (
                <View key={i} style={s.chartCol}>
                  <Text style={s.chartVal}>{d.orders}</Text>
                  <View style={s.chartBarWrap}>
                    <View style={[s.chartBar, { height: Math.max((d.revenue / maxRevenue) * 80, 4) }]} />
                  </View>
                  <Text style={s.chartDay}>{d.day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Materials */}
        {reports?.top_materials?.length > 0 && (
          <View style={s.topSection}>
            <View style={s.sectionHeader}>
              <Medal size={16} color="#FFB300" />
              <Text style={s.sectionTitle}>Eng ko'p sotilgan</Text>
            </View>
            {reports.top_materials.map((m: any, i: number) => (
              <View key={i} style={s.topItem}>
                <View style={[s.topRank, i === 0 && { backgroundColor: 'rgba(255,179,0,0.15)' }]}>
                  <Text style={[s.topRankText, i === 0 && { color: '#FFB300' }]}>{i + 1}</Text>
                </View>
                <View style={s.topInfo}>
                  <Text style={s.topName}>{m.name}</Text>
                  <Text style={s.topMeta}>{m.count} dona · {m.total_sqm?.toFixed(1)} kv.m</Text>
                </View>
                <Text style={s.topPrice}>{formatPrice(Math.round(m.total_price * 100) / 100)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Info Row */}
        <View style={s.infoRow}>
          {[
            { icon: Users, val: stats?.total_dealers || 0, label: 'Dilerlar', color: '#6C63FF' },
            { icon: Wrench, val: stats?.total_workers || 0, label: 'Ishchilar', color: '#448AFF' },
            { icon: Boxes, val: stats?.total_materials || 0, label: 'Materiallar', color: '#FFB300' },
            { icon: XCircle, val: stats?.rejected_orders || 0, label: 'Rad etilgan', color: '#FF5252' },
          ].map((c, i) => (
            <View key={i} style={s.infoCard}>
              <c.icon size={18} color={c.color} />
              <Text style={s.infoVal}>{c.val}</Text>
              <Text style={s.infoLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfile} transparent animationType="slide">
        <View style={s.modalBg}><View style={s.modal}>
          <View style={s.modalH}>
            <Text style={s.modalTitle}>Profil sozlamalari</Text>
            <TouchableOpacity onPress={() => setShowProfile(false)}>
              <X size={22} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody}>
            {profileMsg ? <View style={s.successBox}><Text style={s.successText}>{profileMsg}</Text></View> : null}
            {profileErr ? <View style={s.errorBox}><Text style={s.errorText}>{profileErr}</Text></View> : null}
            <Text style={s.label}>Yangi Email</Text>
            <TextInput style={s.modalInput} value={profileForm.email} onChangeText={v => setProfileForm({...profileForm, email: v})} placeholder="email@..." placeholderTextColor="rgba(255,255,255,0.2)" autoCapitalize="none" keyboardType="email-address" />
            <Text style={s.label}>Yangi Parol</Text>
            <TextInput style={s.modalInput} value={profileForm.password} onChangeText={v => setProfileForm({...profileForm, password: v})} placeholder="Yangi parol" placeholderTextColor="rgba(255,255,255,0.2)" secureTextEntry />
            <Text style={[s.label, { marginTop: 24, color: colors.warning }]}>Joriy Parol (majburiy)</Text>
            <TextInput style={[s.modalInput, { borderColor: 'rgba(255,179,0,0.3)' }]} value={profileForm.current_password} onChangeText={v => setProfileForm({...profileForm, current_password: v})} placeholder="Joriy parol" placeholderTextColor="rgba(255,255,255,0.2)" secureTextEntry />
            <TouchableOpacity style={s.saveBtn} onPress={saveProfile} disabled={profileLoading}>
              {profileLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Saqlash</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  hi: { fontSize: 13, color: colors.textSec, fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },

  // Alert Banner
  alertBanner: { backgroundColor: 'rgba(255,82,82,0.06)', borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,82,82,0.12)' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#FF5252', textTransform: 'uppercase', letterSpacing: 0.5 },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,82,82,0.06)' },
  alertItemName: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  alertItemStock: { fontSize: 14, fontWeight: '700', color: '#FFB300' },

  // Revenue Cards
  revenueRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  revenueCard: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  revenueGrad: { padding: 16, gap: 4 },
  revenueLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  revenueVal: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 4 },
  revenueSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  // Status Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 26, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: colors.textSec, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },

  // Chart
  chartSection: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  chartCol: { alignItems: 'center', flex: 1, gap: 4 },
  chartVal: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  chartBarWrap: { width: 20, height: 80, justifyContent: 'flex-end', borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' },
  chartBar: { width: '100%', backgroundColor: colors.accent, borderRadius: 10, minHeight: 4 },
  chartDay: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },

  // Top Materials
  topSection: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  topItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  topRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  topRankText: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.4)' },
  topInfo: { flex: 1 },
  topName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  topMeta: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  topPrice: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Info Row
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCard: { width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.cardBorder },
  infoVal: { fontSize: 20, fontWeight: '700', color: '#fff' },
  infoLabel: { fontSize: 11, color: colors.textSec, fontWeight: '500' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#0a0a0f', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: '80%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalBody: { padding: 22, paddingBottom: 40 },
  label: { fontSize: 11, color: colors.textSec, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  modalInput: { height: 52, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 18, fontSize: 15, color: '#fff' },
  saveBtn: { height: 56, backgroundColor: colors.accent, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  successBox: { backgroundColor: colors.successSoft, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  successText: { color: colors.success, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)' },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
