import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, X, Phone, MapPin, CreditCard } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, formatPrice } from '../../src/utils/theme';

export default function AdminDealers() {
  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', credit_limit: '' });

  const fetchDealers = useCallback(async () => {
    try { setDealers(await api('/dealers')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchDealers(); }, []);

  const addDealer = async () => {
    if (!form.name || !form.email || !form.password) return;
    try {
      await api('/dealers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          phone: form.phone, address: form.address,
          credit_limit: parseFloat(form.credit_limit) || 0,
        }),
      });
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', phone: '', address: '', credit_limit: '' });
      fetchDealers();
    } catch (e: any) {
      console.error(e.message);
    }
  };

  const deleteDealer = async (id: string) => {
    try { await api(`/dealers/${id}`, { method: 'DELETE' }); fetchDealers(); }
    catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dilerlar</Text>
        <TouchableOpacity testID="add-dealer-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Plus size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDealers(); }} tintColor="#fff" />}
          contentContainerStyle={styles.scrollContent}
        >
          {dealers.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>Dilerlar topilmadi</Text>
            </View>
          ) : dealers.map(d => (
            <View key={d.id} style={styles.dealerCard} testID={`dealer-card-${d.id}`}>
              <View style={styles.dealerHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{d.name?.charAt(0)?.toUpperCase()}</Text>
                </View>
                <View style={styles.dealerInfo}>
                  <Text style={styles.dealerName}>{d.name}</Text>
                  <Text style={styles.dealerEmail}>{d.email}</Text>
                </View>
                <TouchableOpacity testID={`delete-dealer-${d.id}`} onPress={() => deleteDealer(d.id)}>
                  <X size={18} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
              <View style={styles.dealerStats}>
                {d.phone ? (
                  <View style={styles.dealerStatItem}>
                    <Phone size={14} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.dealerStatText}>{d.phone}</Text>
                  </View>
                ) : null}
                {d.address ? (
                  <View style={styles.dealerStatItem}>
                    <MapPin size={14} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.dealerStatText}>{d.address}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.financialRow}>
                <View style={styles.finItem}>
                  <Text style={styles.finLabel}>Limit</Text>
                  <Text style={styles.finValue}>{formatPrice(d.credit_limit || 0)}</Text>
                </View>
                <View style={styles.finItem}>
                  <Text style={styles.finLabel}>Qarz</Text>
                  <Text style={[styles.finValue, (d.debt || 0) > 0 && styles.debtValue]}>
                    {formatPrice(d.debt || 0)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalH}>
              <Text style={styles.modalTitle}>Yangi Diler</Text>
              <TouchableOpacity testID="close-add-dealer" onPress={() => setShowAdd(false)}>
                <X size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Ism</Text>
              <TextInput testID="dealer-name-input" style={styles.input} value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholderTextColor="rgba(255,255,255,0.25)" placeholder="Diler ismi" />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput testID="dealer-email-input" style={styles.input} value={form.email} onChangeText={v => setForm({ ...form, email: v })} placeholderTextColor="rgba(255,255,255,0.25)" placeholder="diler@email.uz" keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.inputLabel}>Parol</Text>
              <TextInput testID="dealer-password-input" style={styles.input} value={form.password} onChangeText={v => setForm({ ...form, password: v })} placeholderTextColor="rgba(255,255,255,0.25)" placeholder="Parol" secureTextEntry />

              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput testID="dealer-phone-input" style={styles.input} value={form.phone} onChangeText={v => setForm({ ...form, phone: v })} placeholderTextColor="rgba(255,255,255,0.25)" placeholder="+998..." keyboardType="phone-pad" />

              <Text style={styles.inputLabel}>Manzil</Text>
              <TextInput testID="dealer-address-input" style={styles.input} value={form.address} onChangeText={v => setForm({ ...form, address: v })} placeholderTextColor="rgba(255,255,255,0.25)" placeholder="Manzil" />

              <Text style={styles.inputLabel}>Kredit limiti</Text>
              <TextInput testID="dealer-limit-input" style={styles.input} value={form.credit_limit} onChangeText={v => setForm({ ...form, credit_limit: v })} keyboardType="numeric" placeholderTextColor="rgba(255,255,255,0.25)" placeholder="50000000" />

              <TouchableOpacity testID="save-dealer-btn" style={styles.saveBtn} onPress={addDealer}>
                <Text style={styles.saveBtnText}>Saqlash</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '300', color: '#fff', letterSpacing: -0.5 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  dealerCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', padding: 18, marginBottom: 12,
  },
  dealerHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  dealerInfo: { flex: 1 },
  dealerName: { fontSize: 16, fontWeight: '500', color: '#fff' },
  dealerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  dealerStats: { marginTop: 12, gap: 6 },
  dealerStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dealerStatText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  financialRow: { flexDirection: 'row', marginTop: 14, gap: 16 },
  finItem: { flex: 1 },
  finLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 },
  finValue: { fontSize: 15, fontWeight: '500', color: '#fff' },
  debtValue: { color: '#FF5252' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modalCard: {
    backgroundColor: '#0a0a0a', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '85%',
  },
  modalH: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: { fontSize: 18, fontWeight: '500', color: '#fff' },
  modalBody: { padding: 20 },
  inputLabel: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    height: 48, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16,
    fontSize: 14, color: '#fff',
  },
  saveBtn: {
    height: 52, backgroundColor: '#fff', borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 20,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
