import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderPlus, Package, Plus, Search, Trash2, Upload, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../src/services/apiClient';
import { useCurrency, useTheme } from '../../src/utils/theme';

export default function AdminInventory() {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { formatPrice } = useCurrency();

  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [editingCat, setEditingCat] = useState<any>(null);
  const [showMatModal, setShowMatModal] = useState(false);
  const [matForm, setMatForm] = useState({ name: '', price_per_sqm: '', stock_quantity: '', description: '' });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const fetchData = useCallback(async () => {
    try {
      const [cats, mats] = await Promise.all([
        api('/categories', { cacheKey: 'categories', cacheTtlMs: 60_000 }),
        api('/materials', { cacheKey: 'materials', cacheTtlMs: 60_000 }),
      ]);

      setCategories(cats);
      setMaterials(mats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveCat = useCallback(async () => {
    if (!catForm.name.trim()) {
      return;
    }

    try {
      if (editingCat) {
        await api(`/categories/${editingCat.id}`, { method: 'PUT', body: JSON.stringify(catForm) });
      } else {
        await api('/categories', { method: 'POST', body: JSON.stringify(catForm) });
      }

      setShowCatModal(false);
      setCatForm({ name: '', description: '' });
      setEditingCat(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }, [catForm, editingCat, fetchData]);

  const deleteCat = useCallback((cat: any) => {
    Alert.alert("O'chirish", `"${cat.name}" kategoriyasini o'chirasizmi?`, [
      { text: 'Bekor', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/categories/${cat.id}`, { method: 'DELETE' });
            setSelectedCat(null);
            fetchData();
          } catch (e: any) {
            Alert.alert('Xatolik', e.message);
          }
        },
      },
    ]);
  }, [fetchData]);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ruxsat kerak');
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
  }, []);

  const saveMat = useCallback(async () => {
    if (!matForm.name || !matForm.price_per_sqm || !matForm.stock_quantity || !selectedCat) {
      return;
    }

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

        const res = await fetch(`${BACKEND_URL}/api/upload-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          image_url = data.image_url;
        }
      }

      await api('/materials', {
        method: 'POST',
        body: JSON.stringify({
          name: matForm.name,
          category: selectedCat.name,
          category_id: parseInt(selectedCat.id, 10),
          price_per_sqm: parseFloat(matForm.price_per_sqm),
          stock_quantity: parseFloat(matForm.stock_quantity),
          description: matForm.description,
          unit: 'kv.m',
          image_url,
        }),
      });

      setShowMatModal(false);
      setMatForm({ name: '', price_per_sqm: '', stock_quantity: '', description: '' });
      setImageUri(null);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }, [BACKEND_URL, fetchData, imageUri, matForm, selectedCat]);

  const deleteMat = useCallback((mat: any) => {
    Alert.alert("O'chirish", `"${mat.name}" ni o'chirasizmi?`, [
      { text: 'Bekor', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/materials/${mat.id}`, { method: 'DELETE' });
            fetchData();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  }, [fetchData]);

  const filteredMaterials = materials.filter((material) => {
    if (selectedCat && material.category_id !== selectedCat.id) {
      return false;
    }

    if (search && !material.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={c.accent} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ombor</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => {
              setCatForm({ name: '', description: '' });
              setEditingCat(null);
              setShowCatModal(true);
            }}
          >
            <FolderPlus size={16} color={c.accent} />
          </TouchableOpacity>
          {selectedCat ? (
            <TouchableOpacity
              style={[styles.roundButton, styles.primaryRoundButton]}
              onPress={() => {
                setMatForm({ name: '', price_per_sqm: '', stock_quantity: '', description: '' });
                setImageUri(null);
                setShowMatModal(true);
              }}
            >
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={styles.categoryContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCat && styles.categoryChipActive]}
          onPress={() => setSelectedCat(null)}
        >
          <Text style={[styles.categoryChipLabel, !selectedCat && styles.categoryChipLabelActive]}>
            Barchasi ({materials.length})
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const active = selectedCat?.id === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setSelectedCat(cat)}
            >
              <Text style={[styles.categoryChipLabel, active && styles.categoryChipLabelActive]}>
                {cat.name} ({cat.material_count || 0})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.searchRow}>
        <Search size={16} color={c.textTer} />
        <TextInput
          style={styles.searchInput}
          placeholder="Qidirish..."
          placeholderTextColor={c.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
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
        contentContainerStyle={styles.list}
      >
        {selectedCat ? (
          <View style={styles.selectedCategoryBar}>
            <Text style={styles.selectedCategoryName}>{selectedCat.name}</Text>
            <TouchableOpacity style={styles.deleteCategoryButton} onPress={() => deleteCat(selectedCat)}>
              <Trash2 size={14} color={c.danger} />
            </TouchableOpacity>
          </View>
        ) : null}

        {filteredMaterials.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Package size={44} color={c.textTer} />
            <Text style={styles.emptyText}>
              {selectedCat ? "Bu kategoriyada mahsulot yo'q" : 'Mahsulot topilmadi'}
            </Text>
          </View>
        ) : (
          filteredMaterials.map((material) => (
            <View key={material.id} style={styles.materialCard}>
              <View style={styles.materialRow}>
                {material.image_url ? (
                  <Image
                    source={{ uri: material.image_url.startsWith('/') ? `${BACKEND_URL}${material.image_url}` : material.image_url }}
                    style={styles.materialImage}
                  />
                ) : (
                  <View style={styles.materialImagePlaceholder}>
                    <Package size={18} color={c.textTer} />
                  </View>
                )}

                <View style={styles.materialInfo}>
                  <Text style={styles.materialName} numberOfLines={1}>{material.name}</Text>
                  <Text style={styles.materialCategory}>{material.category_name || material.category}</Text>
                  <Text style={styles.materialPrice}>{formatPrice(material.price_per_sqm)}/kv.m</Text>
                  <Text style={styles.materialStock}>{material.stock_quantity} {material.unit || 'kv.m'}</Text>
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteMat(material)}>
                  <Trash2 size={14} color={c.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showCatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCat ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)}>
                <X size={22} color={c.textSec} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Nomi</Text>
              <TextInput
                style={styles.input}
                value={catForm.name}
                onChangeText={(value) => setCatForm({ ...catForm, name: value })}
                placeholder="Masalan: Parda"
                placeholderTextColor={c.placeholder}
              />

              <Text style={styles.fieldLabel}>Tavsif</Text>
              <TextInput
                style={styles.input}
                value={catForm.description}
                onChangeText={(value) => setCatForm({ ...catForm, description: value })}
                placeholder="Qisqacha tavsif"
                placeholderTextColor={c.placeholder}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={saveCat}>
                <Text style={styles.primaryButtonText}>Saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yangi mahsulot</Text>
              <TouchableOpacity onPress={() => setShowMatModal(false)}>
                <X size={22} color={c.textSec} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <View style={styles.selectedCategoryChip}>
                <Text style={styles.selectedCategoryChipText}>{selectedCat?.name}</Text>
              </View>

              <Text style={styles.fieldLabel}>Rasm</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Upload size={22} color={c.textTer} />
                    <Text style={styles.imagePlaceholderText}>Galereyadan tanlash</Text>
                  </View>
                )}
              </TouchableOpacity>

              {[
                { label: 'Nomi', key: 'name', placeholder: 'Mahsulot nomi' },
                { label: 'Narxi ($/kv.m)', key: 'price_per_sqm', placeholder: '0.00', keyboard: 'decimal-pad' },
                { label: 'Qoldiq (kv.m)', key: 'stock_quantity', placeholder: '0', keyboard: 'decimal-pad' },
                { label: 'Tavsif', key: 'description', placeholder: 'Qisqacha tavsif' },
              ].map((field) => (
                <View key={field.key}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(matForm as any)[field.key]}
                    onChangeText={(value) => setMatForm({ ...matForm, [field.key]: value })}
                    placeholder={field.placeholder}
                    placeholderTextColor={c.placeholder}
                    keyboardType={(field as any).keyboard || 'default'}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.primaryButton} onPress={saveMat} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Saqlash</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  loader: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  title: {
    color: c.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12141B',
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  primaryRoundButton: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  categoryRow: {
    maxHeight: 54,
    marginTop: 12,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#10131A',
    borderColor: c.cardBorder,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(108,99,255,0.18)',
    borderColor: 'rgba(108,99,255,0.35)',
  },
  categoryChipLabel: {
    color: c.textSec,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryChipLabelActive: {
    color: c.accent,
  },
  searchRow: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#10131A',
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: c.text,
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
    gap: 10,
  },
  selectedCategoryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedCategoryName: {
    color: c.textSec,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteCategoryButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.dangerSoft,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 90,
    gap: 12,
  },
  emptyText: {
    color: c.textSec,
    fontSize: 15,
    fontWeight: '600',
  },
  materialCard: {
    backgroundColor: '#0E1015',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  materialImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  materialImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: c.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialInfo: {
    flex: 1,
    gap: 2,
  },
  materialName: {
    color: c.text,
    fontSize: 16,
    fontWeight: '700',
  },
  materialCategory: {
    color: c.textTer,
    fontSize: 12,
    fontWeight: '500',
  },
  materialPrice: {
    color: c.textSec,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  materialStock: {
    color: c.textTer,
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.dangerSoft,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: c.modalBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  modalTitle: {
    color: c.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 34,
  },
  fieldLabel: {
    color: c.textSec,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.inputBorder,
    backgroundColor: c.inputBg,
    color: c.text,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  primaryButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  selectedCategoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108,99,255,0.16)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  selectedCategoryChipText: {
    color: c.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  imagePicker: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderStyle: 'dashed',
  },
  imagePreview: {
    width: '100%',
    height: 170,
  },
  imagePlaceholder: {
    height: 126,
    backgroundColor: c.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: c.textTer,
    fontSize: 13,
    fontWeight: '600',
  },
});
