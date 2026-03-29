import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boxes, Plus, X, Search } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, formatPrice } from '../../src/utils/theme';

export default function AdminInventory() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', category: 'Parda', price_per_sqm: '', stock_quantity: '', description: '' });

  const fetch_ = useCallback(async () => {
    try { setMaterials(await api('/materials')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch_(); }, []);

  const addMaterial = async () => {
    if (!form.name || !form.price_per_sqm || !form.stock_quantity) return;
    try {
      await api('/materials', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, category: form.category,
          price_per_sqm: parseFloat(form.price_per_sqm),
          stock_quantity: parseFloat(form.stock_quantity),
          description: form.description, unit: 'kv.m',
        }),
      });
      setShowAdd(false);
      setForm({ name: '', category: 'Parda', price_per_sqm: '', stock_quantity: '', description: '' });
      fetch_();
    } catch (e) { console.error(e); }
  };

  const deleteMaterial = async (id: string) => {
    try { await api(`/materials/${id}`, { method: 'DELETE' }); fetch_(); }
    catch (e) { console.error(e); }
  };

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ombor</Text>
        <TouchableOpacity testID="add-material-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Plus size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Search size={18} color="rgba(255,255,255,0.3)" />
        <TextInput
          testID="material-search-input"
          style={styles.searchInput}
          placeholder="Qidirish..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch_(); }} tintColor="#fff" />}
          contentContainerStyle={styles.scrollContent}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Boxes size={48} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>Materiallar topilmadi</Text>
            </View>
          ) : filtered.map(mat => (
            <View key={mat.id} style={styles.matCard} testID={`material-card-${mat.id}`}>
              <View style={styles.matHeader}>
                <View style={styles.matInfo}>
                  <Text style={styles.matName}>{mat.name}</Text>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>{mat.category}</Text>
                  </View>
                </View>
                <TouchableOpacity testID={`delete-material-${mat.id}`} onPress={() => deleteMaterial(mat.id)}>
                  <X size={18} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
              <View style={styles.matRow}>
                <View style={styles.matStat}>
                  <Text style={styles.matStatLabel}>Narx / kv.m</Text>
                  <Text style={styles.matStatValue}>{formatPrice(mat.price_per_sqm)}</Text>
                </View>
                <View style={styles.matStat}>
                  <Text style={styles.matStatLabel}>Qoldiq</Text>
                  <Text style={styles.matStatValue}>{mat.stock_quantity} {mat.unit}</Text>
                </View>
              </View>
              {mat.description ? <Text style={styles.matDesc}>{mat.description}</Text> : null}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yangi Material</Text>
              <TouchableOpacity testID="close-add-material" onPress={() => setShowAdd(false)}>
                <X size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nomi</Text>
              <TextInput testID="material-name-input" style={styles.input} value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholderTextColor="rgba(255,255,255,0.25)" placeholder="Material nomi" />

              <Text style={styles.inputLabel}>Kategoriya</Text>
              <View style={styles.catRow}>
                {['Parda', 'Jalyuzi'].map(c => (
                  <TouchableOpacity key={c} style={[styles.catBtn, form.category === c && styles.catBtnActive]} onPress={() => setForm({ ...form, category: c })}>
                    <Text style={[styles.catBtnText, form.category === c && styles.catBtnTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Narx (kv.m uchun)</Text>
              <TextInput testID="material-price-input" style={styles.input} value={form.price_per_sqm} onChangeText={v => setForm({ ...form, price_per_sqm: v })} keyboardType="numeric" placeholderTextColor="rgba(255,255,255,0.25)" placeholder="85000" />

              <Text style={styles.inputLabel}>Qoldiq (kv.m)</Text>
              <TextInput testID="material-stock-input" style={styles.input} value={form.stock_quantity} onChangeText={v => setForm({ ...form, stock_quantity: v })} keyboardType="numeric" placeholderTextColor="rgba(255,255,255,0.25)" placeholder="500" />

              <Text style={styles.inputLabel}>Tavsif</Text>
              <TextInput testID="material-desc-input" style={styles.input} value={form.description} onChangeText={v => setForm({ ...form, description: v })} placeholderTextColor="rgba(255,255,255,0.25)" placeholder="Qo'shimcha ma'lumot" />

              <TouchableOpacity testID="save-material-btn" style={styles.saveBtn} onPress={addMaterial}>
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
  searchRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', marginLeft: 10 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  matCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', padding: 18, marginBottom: 12,
  },
  matHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  matInfo: { flex: 1, gap: 6 },
  matName: { fontSize: 16, fontWeight: '500', color: '#fff' },
  catBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  catText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
  matRow: { flexDirection: 'row', marginTop: 14, gap: 16 },
  matStat: { flex: 1 },
  matStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 },
  matStatValue: { fontSize: 15, fontWeight: '500', color: '#fff' },
  matDesc: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modalCard: {
    backgroundColor: '#0a0a0a', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '85%',
  },
  modalHeader: {
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
  catRow: { flexDirection: 'row', gap: 8 },
  catBtn: {
    flex: 1, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  catBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' },
  catBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  catBtnTextActive: { color: '#fff' },
  saveBtn: {
    height: 52, backgroundColor: '#fff', borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
