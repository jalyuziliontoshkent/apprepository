import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Minus, ShoppingCart, Calculator } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, formatPrice } from '../../src/utils/theme';

type OrderItem = {
  material_id: string;
  material_name: string;
  width: string;
  height: string;
  quantity: number;
  price_per_sqm: number;
};

export default function NewOrder() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedMat, setSelectedMat] = useState<any>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api('/materials').then(setMaterials).catch(console.error).finally(() => setLoading(false));
  }, []);

  const sqm = (parseFloat(width) || 0) * (parseFloat(height) || 0);
  const price = sqm * (selectedMat?.price_per_sqm || 0);

  const addItem = () => {
    if (!selectedMat || !width || !height || sqm <= 0) return;
    setItems([...items, {
      material_id: selectedMat.id,
      material_name: selectedMat.name,
      width,
      height,
      quantity: 1,
      price_per_sqm: selectedMat.price_per_sqm,
    }]);
    setWidth('');
    setHeight('');
    setSelectedMat(null);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalSqm = items.reduce((s, it) => s + (parseFloat(it.width) * parseFloat(it.height) * it.quantity), 0);
  const totalPrice = items.reduce((s, it) => s + (parseFloat(it.width) * parseFloat(it.height) * it.quantity * it.price_per_sqm), 0);

  const submitOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(it => ({
            material_id: it.material_id,
            material_name: it.material_name,
            width: parseFloat(it.width),
            height: parseFloat(it.height),
            quantity: it.quantity,
            price_per_sqm: it.price_per_sqm,
          })),
          notes,
        }),
      });
      setItems([]);
      setNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Yangi Buyurtma</Text>

          {success && (
            <View style={styles.successBox} testID="order-success">
              <Text style={styles.successText}>Buyurtma muvaffaqiyatli yuborildi!</Text>
            </View>
          )}

          {/* Material selection */}
          <Text style={styles.sectionLabel}>Material tanlang</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matScroll} contentContainerStyle={styles.matScrollContent}>
            {materials.map(m => (
              <TouchableOpacity
                key={m.id}
                testID={`select-material-${m.id}`}
                style={[styles.matChip, selectedMat?.id === m.id && styles.matChipActive]}
                onPress={() => setSelectedMat(m)}
              >
                <Text style={[styles.matChipName, selectedMat?.id === m.id && styles.matChipNameActive]}>{m.name}</Text>
                <Text style={[styles.matChipPrice, selectedMat?.id === m.id && styles.matChipPriceActive]}>
                  {formatPrice(m.price_per_sqm)}/kv.m
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Calculator */}
          <View style={styles.calcCard}>
            <View style={styles.calcHeader}>
              <Calculator size={18} color="rgba(255,255,255,0.5)" />
              <Text style={styles.calcTitle}>O'lcham Kalkulyator</Text>
            </View>
            <View style={styles.calcInputRow}>
              <View style={styles.calcInputGroup}>
                <Text style={styles.calcInputLabel}>En (m)</Text>
                <TextInput
                  testID="calc-width-input"
                  style={styles.calcInput}
                  value={width}
                  onChangeText={setWidth}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="rgba(255,255,255,0.15)"
                />
              </View>
              <Text style={styles.calcX}>×</Text>
              <View style={styles.calcInputGroup}>
                <Text style={styles.calcInputLabel}>Bo'yi (m)</Text>
                <TextInput
                  testID="calc-height-input"
                  style={styles.calcInput}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="rgba(255,255,255,0.15)"
                />
              </View>
            </View>
            <View style={styles.calcResult}>
              <View style={styles.calcResultItem}>
                <Text style={styles.calcResultLabel}>Maydoni</Text>
                <Text style={styles.calcResultValue}>{sqm.toFixed(2)} kv.m</Text>
              </View>
              <View style={styles.calcResultDivider} />
              <View style={styles.calcResultItem}>
                <Text style={styles.calcResultLabel}>Narxi</Text>
                <Text style={styles.calcResultValue}>{formatPrice(Math.round(price))}</Text>
              </View>
            </View>
            <TouchableOpacity
              testID="add-item-btn"
              style={[styles.addItemBtn, (!selectedMat || sqm <= 0) && styles.addItemBtnDisabled]}
              onPress={addItem}
              disabled={!selectedMat || sqm <= 0}
            >
              <Plus size={18} color="#000" />
              <Text style={styles.addItemBtnText}>Qo'shish</Text>
            </TouchableOpacity>
          </View>

          {/* Items list */}
          {items.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Tanlangan mahsulotlar ({items.length})</Text>
              {items.map((item, idx) => (
                <View key={idx} style={styles.itemCard} testID={`order-item-${idx}`}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.material_name}</Text>
                    <Text style={styles.itemDetail}>
                      {item.width}m × {item.height}m = {(parseFloat(item.width) * parseFloat(item.height)).toFixed(2)} kv.m
                    </Text>
                    <Text style={styles.itemPrice}>
                      {formatPrice(Math.round(parseFloat(item.width) * parseFloat(item.height) * item.quantity * item.price_per_sqm))}
                    </Text>
                  </View>
                  <TouchableOpacity testID={`remove-item-${idx}`} onPress={() => removeItem(idx)} style={styles.removeBtn}>
                    <Minus size={16} color="#FF5252" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Total */}
              <View style={styles.totalCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Jami Maydoni:</Text>
                  <Text style={styles.totalValue}>{totalSqm.toFixed(2)} kv.m</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Jami Narx:</Text>
                  <Text style={styles.totalValueBig}>{formatPrice(Math.round(totalPrice))}</Text>
                </View>
              </View>

              <TextInput
                testID="order-notes-input"
                style={styles.notesInput}
                placeholder="Qo'shimcha izoh..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity
                testID="submit-order-btn"
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submitOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <ShoppingCart size={20} color="#000" />
                    <Text style={styles.submitBtnText}>Buyurtma Yuborish</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: '300', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
  successBox: {
    backgroundColor: 'rgba(0,200,83,0.15)', borderRadius: 16, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)',
  },
  successText: { color: '#00C853', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  sectionLabel: {
    fontSize: 12, color: colors.textMuted, letterSpacing: 2,
    textTransform: 'uppercase', marginTop: 20, marginBottom: 12,
  },
  matScroll: { maxHeight: 90 },
  matScrollContent: { gap: 8, paddingRight: 16 },
  matChip: {
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 120,
  },
  matChipActive: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' },
  matChipName: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  matChipNameActive: { color: '#fff' },
  matChipPrice: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 },
  matChipPriceActive: { color: 'rgba(255,255,255,0.6)' },
  calcCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', padding: 20, marginTop: 16,
  },
  calcHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  calcTitle: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  calcInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  calcInputGroup: { flex: 1 },
  calcInputLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, letterSpacing: 0.5 },
  calcInput: {
    height: 56, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16,
    fontSize: 22, color: '#fff', textAlign: 'center', fontVariant: ['tabular-nums'],
  },
  calcX: { fontSize: 22, color: 'rgba(255,255,255,0.3)', paddingBottom: 14 },
  calcResult: {
    flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, padding: 16,
  },
  calcResultItem: { flex: 1, alignItems: 'center' },
  calcResultLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 },
  calcResultValue: { fontSize: 18, fontWeight: '500', color: '#fff', fontVariant: ['tabular-nums'] },
  calcResultDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.08)' },
  addItemBtn: {
    height: 48, backgroundColor: '#fff', borderRadius: 24, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16,
  },
  addItemBtnDisabled: { opacity: 0.3 },
  addItemBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, marginBottom: 8,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  itemDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '500', color: '#fff', marginTop: 4 },
  removeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,82,82,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)',
  },
  totalCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', padding: 20, marginTop: 8, gap: 8,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  totalValue: { fontSize: 16, fontWeight: '500', color: '#fff' },
  totalValueBig: { fontSize: 20, fontWeight: '600', color: '#fff' },
  notesInput: {
    minHeight: 48, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 14, color: '#fff', marginTop: 16,
  },
  submitBtn: {
    height: 56, backgroundColor: '#fff', borderRadius: 28, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
