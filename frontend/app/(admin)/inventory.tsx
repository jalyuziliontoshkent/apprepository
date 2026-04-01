import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, Image, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Search, Upload, FolderPlus, Edit3, Trash2, ChevronRight, Package } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../_layout';
import { colors, formatPrice } from '../../src/utils/theme';

export default function AdminInventory() {
  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [search, setSearch] = useState('');

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [editingCat, setEditingCat] = useState<any>(null);

  // Material modal
  const [showMatModal, setShowMatModal] = useState(false);
  const [matForm, setMatForm] = useState({ name: '', price_per_sqm: '', stock_quantity: '', description: '' });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchData = useCallback(async () => {
    try {
      const [cats, mats] = await Promise.all([api('/categories'), api('/materials')]);
      setCategories(cats);
      setMaterials(mats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  // Category CRUD
  const saveCat = async () => {
    if (!catForm.name.trim()) return;
    try {
      if (editingCat) {
        await api(`/categories/${editingCat.id}`, { method: 'PUT', body: JSON.stringify(catForm) });
      } else {
        await api('/categories', { method: 'POST', body: JSON.stringify(catForm) });
      }
      setShowCatModal(false); setCatForm({ name: '', description: '' }); setEditingCat(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const deleteCat = async (cat: any) => {
    Alert.alert('O\'chirish', `"${cat.name}" kategoriyasini o'chirasizmi?`, [
      { text: 'Bekor', style: 'cancel' },
      { text: 'O\'chirish', style: 'destructive', onPress: async () => {
        try {
          await api(`/categories/${cat.id}`, { method: 'DELETE' });
          setSelectedCat(null);
          fetchData();
        } catch (e: any) { Alert.alert('Xatolik', e.message || 'O\'chirib bo\'lmadi'); }
      }},
    ]);
  };

  // Material CRUD
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Ruxsat kerak'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const saveMat = async () => {
    if (!matForm.name || !matForm.price_per_sqm || !matForm.stock_quantity || !selectedCat) return;
    setUploading(true);
    try {
      let image_url = '';
      if (imageUri) {
        const token = await AsyncStorage.getItem('token');
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('file', { uri: imageUri, name: filename, type } as any);
        const res = await fetch(`${BACKEND_URL}/api/upload-image`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        if (res.ok) { const data = await res.json(); image_url = data.image_url; }
      }
      await api('/materials', {
        method: 'POST',
        body: JSON.stringify({
          name: matForm.name, category: selectedCat.name, category_id: parseInt(selectedCat.id),
          price_per_sqm: parseFloat(matForm.price_per_sqm), stock_quantity: parseFloat(matForm.stock_quantity),
          description: matForm.description, unit: 'kv.m', image_url,
        }),
      });
      setShowMatModal(false); setMatForm({ name: '', price_per_sqm: '', stock_quantity: '', description: '' }); setImageUri(null);
      fetchData();
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const deleteMat = async (mat: any) => {
    Alert.alert('O\'chirish', `"${mat.name}" ni o'chirasizmi?`, [
      { text: 'Bekor', style: 'cancel' },
      { text: 'O\'chirish', style: 'destructive', onPress: async () => {
        try { await api(`/materials/${mat.id}`, { method: 'DELETE' }); fetchData(); }
        catch (e) { console.error(e); }
      }},
    ]);
  };

  const filteredMats = materials.filter(m => {
    if (selectedCat && m.category_id !== selectedCat.id) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <SafeAreaView style={s.c}><ActivityIndicator size="large" color={colors.accent} style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.c}>
      <View style={s.header}>
        <Text style={s.title}>Ombor</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.addCatBtn} onPress={() => { setCatForm({ name: '', description: '' }); setEditingCat(null); setShowCatModal(true); }}>
            <FolderPlus size={16} color={colors.accent} />
          </TouchableOpacity>
          {selectedCat && (
            <TouchableOpacity style={s.addMatBtn} onPress={() => { setMatForm({ name: '', price_per_sqm: '', stock_quantity: '', description: '' }); setImageUri(null); setShowMatModal(true); }}>
              <Plus size={16} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catRow} contentContainerStyle={s.catContent}>
        <TouchableOpacity style={[s.catChip, !selectedCat && s.catChipActive]} onPress={() => setSelectedCat(null)}>
          <Text style={[s.catChipText, !selectedCat && s.catChipTextActive]}>Barchasi ({materials.length})</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity key={cat.id} style={[s.catChip, selectedCat?.id === cat.id && s.catChipActive]} onPress={() => setSelectedCat(cat)}>
            <Text style={[s.catChipText, selectedCat?.id === cat.id && s.catChipTextActive]}>{cat.name} ({cat.material_count || 0})</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category edit/delete buttons - when a category is selected */}
      {selectedCat && (
        <View style={s.catActions}>
          <Text style={s.catActionsLabel}>{selectedCat.name}</Text>
          <View style={s.catActionBtns}>
            <TouchableOpacity style={s.catEditBtn} onPress={() => { setEditingCat(selectedCat); setCatForm({ name: selectedCat.name, description: selectedCat.description || '' }); setShowCatModal(true); }}>
              <Edit3 size={14} color={colors.accent} />
              <Text style={s.catEditText}>Tahrirlash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.catDelBtn} onPress={() => deleteCat(selectedCat)}>
              <Trash2 size={14} color="#FF5252" />
              <Text style={s.catDelText}>O'chirish</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={s.searchRow}>
        <Search size={16} color="rgba(255,255,255,0.2)" />
        <TextInput style={s.searchInput} placeholder="Qidirish..." placeholderTextColor="rgba(255,255,255,0.2)" value={search} onChangeText={setSearch} />
      </View>

      {/* Materials Grid */}
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fff" />} contentContainerStyle={s.list}>
        {filteredMats.length === 0 ? (
          <View style={s.empty}>
            <Package size={48} color="rgba(255,255,255,0.06)" />
            <Text style={s.emptyText}>{selectedCat ? 'Bu kategoriyada mahsulot yo\'q' : 'Mahsulot topilmadi'}</Text>
            {selectedCat && <Text style={s.emptyHint}>Yuqoridagi "+" tugmasini bosib qo'shing</Text>}
          </View>
        ) : filteredMats.map(mat => (
          <View key={mat.id} style={s.matCard}>
            <View style={s.matRow}>
              {mat.image_url ? (
                <Image source={{ uri: mat.image_url.startsWith('/') ? `${BACKEND_URL}${mat.image_url}` : mat.image_url }} style={s.matImg} />
              ) : (
                <View style={[s.matImg, s.matImgEmpty]}><Package size={20} color="rgba(255,255,255,0.1)" /></View>
              )}
              <View style={s.matInfo}>
                <Text style={s.matName} numberOfLines={1}>{mat.name}</Text>
                <Text style={s.matCat}>{mat.category_name || mat.category}</Text>
                <View style={s.matMeta}>
                  <Text style={s.matPrice}>{formatPrice(mat.price_per_sqm)}/kv.m</Text>
                  {mat.stock_quantity < 10 ? (
                    <View style={s.lowBadge}><Text style={s.lowText}>⚠ {mat.stock_quantity}</Text></View>
                  ) : (
                    <Text style={s.matStock}>{mat.stock_quantity} {mat.unit}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={s.delBtn} onPress={() => deleteMat(mat)}>
                <Trash2 size={14} color="rgba(255,82,82,0.6)" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={showCatModal} transparent animationType="slide">
        <View style={s.modalBg}><View style={s.modal}>
          <View style={s.modalH}>
            <Text style={s.modalTitle}>{editingCat ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</Text>
            <TouchableOpacity onPress={() => setShowCatModal(false)}><X size={22} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
          </View>
          <View style={s.modalBody}>
            <Text style={s.label}>Nomi</Text>
            <TextInput style={s.input} value={catForm.name} onChangeText={v => setCatForm({...catForm, name: v})} placeholder="Masalan: Parda" placeholderTextColor="rgba(255,255,255,0.2)" />
            <Text style={s.label}>Tavsif</Text>
            <TextInput style={s.input} value={catForm.description} onChangeText={v => setCatForm({...catForm, description: v})} placeholder="Qisqacha tavsif" placeholderTextColor="rgba(255,255,255,0.2)" />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.saveBtn} onPress={saveCat}>
                <Text style={s.saveBtnText}>Saqlash</Text>
              </TouchableOpacity>
              {editingCat && (
                <TouchableOpacity style={s.deleteBtn} onPress={() => { setShowCatModal(false); deleteCat(editingCat); }}>
                  <Trash2 size={16} color="#FF5252" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View></View>
      </Modal>

      {/* Material Modal */}
      <Modal visible={showMatModal} transparent animationType="slide">
        <View style={s.modalBg}><View style={s.modal}>
          <View style={s.modalH}>
            <Text style={s.modalTitle}>Yangi mahsulot</Text>
            <TouchableOpacity onPress={() => setShowMatModal(false)}><X size={22} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
            <View style={s.catTag}><Text style={s.catTagText}>{selectedCat?.name}</Text></View>
            <Text style={s.label}>Rasm</Text>
            <TouchableOpacity style={s.imgPicker} onPress={pickImage}>
              {imageUri ? <Image source={{ uri: imageUri }} style={s.imgPreview} /> : (
                <View style={s.imgPlaceholder}><Upload size={24} color="rgba(255,255,255,0.2)" /><Text style={s.imgPlaceholderText}>Galereyadan tanlash</Text></View>
              )}
            </TouchableOpacity>
            <Text style={s.label}>Nomi</Text>
            <TextInput style={s.input} value={matForm.name} onChangeText={v => setMatForm({...matForm, name: v})} placeholder="Mahsulot nomi" placeholderTextColor="rgba(255,255,255,0.2)" />
            <Text style={s.label}>Narxi ($/kv.m)</Text>
            <TextInput style={s.input} value={matForm.price_per_sqm} onChangeText={v => setMatForm({...matForm, price_per_sqm: v})} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="rgba(255,255,255,0.2)" />
            <Text style={s.label}>Qoldiq (kv.m)</Text>
            <TextInput style={s.input} value={matForm.stock_quantity} onChangeText={v => setMatForm({...matForm, stock_quantity: v})} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" />
            <Text style={s.label}>Tavsif</Text>
            <TextInput style={s.input} value={matForm.description} onChangeText={v => setMatForm({...matForm, description: v})} placeholder="Qisqacha tavsif" placeholderTextColor="rgba(255,255,255,0.2)" />
            <TouchableOpacity style={[s.saveBtn, uploading && { opacity: 0.6 }]} onPress={saveMat} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Saqlash</Text>}
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  addCatBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)' },
  addMatBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  catRow: { maxHeight: 48, marginTop: 14 },
  catContent: { paddingHorizontal: 20, gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  catChipActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(108,99,255,0.3)' },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.textSec },
  catChipTextActive: { color: colors.accent },
  catActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  catActionsLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  catActionBtns: { flexDirection: 'row', gap: 8 },
  catEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)' },
  catEditText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  catDelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,82,82,0.06)', borderWidth: 1, borderColor: 'rgba(255,82,82,0.12)' },
  catDelText: { fontSize: 12, fontWeight: '600', color: '#FF5252' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.cardBorder },
  searchInput: { flex: 1, height: 44, color: '#fff', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, color: colors.textTer },
  emptyHint: { fontSize: 12, color: 'rgba(255,255,255,0.2)' },
  matCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 8 },
  matRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  matImg: { width: 56, height: 56, borderRadius: 14 },
  matImgEmpty: { backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  matInfo: { flex: 1 },
  matName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  matCat: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  matMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  matPrice: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  matStock: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  lowBadge: { backgroundColor: 'rgba(255,82,82,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  lowText: { fontSize: 11, fontWeight: '700', color: '#FF5252' },
  delBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,82,82,0.06)', alignItems: 'center', justifyContent: 'center' },
  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#0a0a0f', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: '85%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalBody: { padding: 22 },
  label: { fontSize: 10, color: colors.textSec, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { height: 50, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 16, fontSize: 15, color: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveBtn: { flex: 1, height: 52, backgroundColor: colors.accent, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  deleteBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,82,82,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  catTag: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  catTagText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  imgPicker: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed' },
  imgPreview: { width: '100%', height: 160, borderRadius: 16 },
  imgPlaceholder: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', gap: 8 },
  imgPlaceholderText: { fontSize: 13, color: 'rgba(255,255,255,0.25)' },
});
