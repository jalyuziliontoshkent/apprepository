import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, Image, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Search, ImagePlus, Camera, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../_layout';
import { colors, formatPrice } from '../../src/utils/theme';
import Constants from 'expo-constants';

export default function AdminInventory() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', category: 'Parda', price_per_sqm: '', stock_quantity: '', description: '', image_url: '' });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetch_ = useCallback(async () => {
    try { setMaterials(await api('/materials')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch_(); }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ruxsat kerak', 'Rasm tanlash uchun galereyaga kirish ruxsati kerak.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageUri) return form.image_url;
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri: imageUri, name: filename, type } as any);

      const res = await fetch(`${BACKEND_URL}/api/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Rasm yuklanmadi');
      const data = await res.json();
      return data.image_url;
    } catch (e) {
      console.error('Image upload error:', e);
      Alert.alert('Xatolik', 'Rasm yuklashda xatolik yuz berdi');
      return '';
    } finally {
      setUploading(false);
    }
  };

  const addMaterial = async () => {
    if (!form.name || !form.price_per_sqm || !form.stock_quantity) return;
    try {
      let image_url = form.image_url;
      if (imageUri) {
        image_url = await uploadImage();
      }
      await api('/materials', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, category: form.category,
          price_per_sqm: parseFloat(form.price_per_sqm),
          stock_quantity: parseFloat(form.stock_quantity),
          description: form.description, unit: 'kv.m',
          image_url: image_url,
        }),
      });
      setShowAdd(false);
      setForm({ name: '', category: 'Parda', price_per_sqm: '', stock_quantity: '', description: '', image_url: '' });
      setImageUri(null);
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
          <Plus size={20} color="#fff" />
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
          contentContainerStyle={styles.grid}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Materiallar topilmadi</Text>
            </View>
          ) : filtered.map(mat => (
            <View key={mat.id} style={styles.productCard} testID={`material-card-${mat.id}`}>
              {mat.image_url ? (
                <Image source={{ uri: mat.image_url }} style={styles.productImage} />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <ImagePlus size={28} color="rgba(255,255,255,0.15)" />
                </View>
              )}
              <View style={styles.productBody}>
                <View style={styles.productTopRow}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>{mat.category}</Text>
                  </View>
                  <TouchableOpacity testID={`delete-material-${mat.id}`} onPress={() => deleteMaterial(mat.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={14} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.productName} numberOfLines={1}>{mat.name}</Text>
                <Text style={styles.productPrice}>{formatPrice(mat.price_per_sqm)}<Text style={styles.productUnit}>/kv.m</Text></Text>
                <Text style={styles.productStock}>{mat.stock_quantity} {mat.unit} qoldiq</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yangi Material</Text>
              <TouchableOpacity testID="close-add-material" onPress={() => setShowAdd(false)}>
                <X size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Rasm</Text>
              <TouchableOpacity testID="pick-image-btn" style={styles.imagePickerBtn} onPress={pickImage} activeOpacity={0.7}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePickerPreview} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Upload size={28} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.imagePickerText}>Galereyadan tanlash</Text>
                  </View>
                )}
              </TouchableOpacity>
              {imageUri && (
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                  <X size={14} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.removeImageText}>Rasmni olib tashlash</Text>
                </TouchableOpacity>
              )}

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

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Narx ($/kv.m)</Text>
                  <TextInput testID="material-price-input" style={styles.input} value={form.price_per_sqm} onChangeText={v => setForm({ ...form, price_per_sqm: v })} keyboardType="decimal-pad" placeholderTextColor="rgba(255,255,255,0.25)" placeholder="7.00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Qoldiq (kv.m)</Text>
                  <TextInput testID="material-stock-input" style={styles.input} value={form.stock_quantity} onChangeText={v => setForm({ ...form, stock_quantity: v })} keyboardType="decimal-pad" placeholderTextColor="rgba(255,255,255,0.25)" placeholder="500" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Tavsif</Text>
              <TextInput testID="material-desc-input" style={[styles.input, { height: 60 }]} value={form.description} onChangeText={v => setForm({ ...form, description: v })} placeholderTextColor="rgba(255,255,255,0.25)" placeholder="Qo'shimcha ma'lumot" multiline />

              <TouchableOpacity testID="save-material-btn" style={[styles.saveBtn, uploading && { opacity: 0.6 }]} onPress={addMaterial} disabled={uploading}>
                {uploading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.saveBtnText}>Yuklanmoqda...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>Saqlash</Text>
                )}
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
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', marginLeft: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100, justifyContent: 'space-between' },
  emptyState: { width: '100%', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  productCard: {
    width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12,
  },
  productImage: { width: '100%', height: 120, backgroundColor: '#111' },
  productImagePlaceholder: {
    width: '100%', height: 120, backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center', justifyContent: 'center',
  },
  productBody: { padding: 14, gap: 4 },
  productTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  productName: { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 4 },
  productPrice: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  productUnit: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.4)' },
  productStock: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0c0c0c', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalBody: { padding: 20, paddingBottom: 40 },
  inputLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  input: {
    height: 48, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16,
    fontSize: 15, color: '#fff',
  },
  imagePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  imagePreview: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#111' },
  imagePreviewEmpty: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed' },
  imagePickerBtn: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed' },
  imagePickerPreview: { width: '100%', height: 180, borderRadius: 16 },
  imagePickerPlaceholder: { height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', gap: 8 },
  imagePickerText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  removeImageBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,80,80,0.1)' },
  removeImageText: { fontSize: 12, color: 'rgba(255,80,80,0.7)', fontWeight: '500' },
  catRow: { flexDirection: 'row', gap: 8 },
  catBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  catBtnActive: { backgroundColor: colors.accent },
  catBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  catBtnTextActive: { color: '#fff' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  saveBtn: { height: 54, backgroundColor: colors.accent, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
