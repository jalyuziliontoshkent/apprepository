import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Minus, Send, X, Check, ImagePlus, Trash2, ChevronDown, ChevronUp, StickyNote } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, formatPrice } from '../../src/utils/theme';

type OrderItem = {
  material_id: string;
  material_name: string;
  material_image: string;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api('/materials').then(setMaterials).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Get items count for a specific material
  const getItemsForMaterial = (matId: string) => items.filter(it => it.material_id === matId);
  const getTotalForMaterial = (matId: string) => {
    return getItemsForMaterial(matId).reduce((sum, it) => {
      return sum + (parseFloat(it.width) * parseFloat(it.height) * it.quantity * it.price_per_sqm);
    }, 0);
  };

  const sqm = (parseFloat(width) || 0) * (parseFloat(height) || 0);

  const addItem = (mat: any) => {
    if (sqm <= 0) return;
    const newItem: OrderItem = {
      material_id: mat.id,
      material_name: mat.name,
      material_image: mat.image_url || '',
      width, height, quantity: 1,
      price_per_sqm: mat.price_per_sqm,
    };
    setItems([...items, newItem]);
    setWidth('');
    setHeight('');
    // Keep expanded so user can add more of the same
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
            material_id: it.material_id, material_name: it.material_name,
            width: parseFloat(it.width), height: parseFloat(it.height),
            quantity: it.quantity, price_per_sqm: it.price_per_sqm,
          })),
          notes,
        }),
      });
      setItems([]); setNotes(''); setExpandedId(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: any) { console.error(e.message); }
    finally { setSubmitting(false); }
  };

  const toggleExpand = (matId: string) => {
    if (expandedId === matId) {
      setExpandedId(null);
      setWidth(''); setHeight('');
    } else {
      setExpandedId(matId);
      setWidth(''); setHeight('');
    }
  };

  if (loading) {
    return <SafeAreaView style={s.container}><ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Yangi Buyurtma</Text>
            <Text style={s.subtitle}>Mahsulotni tanlang va o'lcham kiriting</Text>
          </View>
          {items.length > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countText}>{items.length}</Text>
            </View>
          )}
        </View>

        {/* Success banner */}
        {success && (
          <View style={s.successBanner}>
            <Check size={20} color="#00C853" />
            <Text style={s.successText}>Buyurtma yuborildi!</Text>
          </View>
        )}

        {/* Materials list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {materials.map(mat => {
            const isExpanded = expandedId === mat.id;
            const matItems = getItemsForMaterial(mat.id);
            const matTotal = getTotalForMaterial(mat.id);
            const currentSqm = isExpanded ? sqm : 0;
            const currentPrice = isExpanded ? sqm * mat.price_per_sqm : 0;

            return (
              <View key={mat.id} style={[s.materialCard, isExpanded && s.materialCardExpanded, matItems.length > 0 && s.materialCardWithItems]}>
                {/* Material row - always visible */}
                <TouchableOpacity
                  style={s.materialRow}
                  onPress={() => toggleExpand(mat.id)}
                  activeOpacity={0.7}
                >
                  {mat.image_url ? (
                    <Image source={{ uri: mat.image_url }} style={s.matImg} />
                  ) : (
                    <View style={[s.matImg, s.matImgEmpty]}>
                      <ImagePlus size={20} color="rgba(255,255,255,0.15)" />
                    </View>
                  )}
                  <View style={s.matInfo}>
                    <Text style={s.matName} numberOfLines={1}>{mat.name}</Text>
                    <View style={s.matMeta}>
                      <Text style={s.matPrice}>{formatPrice(mat.price_per_sqm)}<Text style={s.matPriceUnit}>/kv.m</Text></Text>
                      {matItems.length > 0 && (
                        <View style={s.matItemCountBadge}>
                          <Text style={s.matItemCountText}>{matItems.length} ta</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[s.expandBtn, isExpanded && s.expandBtnActive]}
                    onPress={() => toggleExpand(mat.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp size={20} color={isExpanded ? '#000' : 'rgba(255,255,255,0.5)'} />
                    ) : (
                      <Plus size={20} color="rgba(255,255,255,0.5)" />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Added items for this material */}
                {matItems.length > 0 && !isExpanded && (
                  <View style={s.addedItemsPreview}>
                    {matItems.map((it, idx) => {
                      const globalIdx = items.indexOf(it);
                      return (
                        <View key={idx} style={s.addedItemChip}>
                          <Text style={s.addedItemChipText}>
                            {it.width}×{it.height}m
                          </Text>
                          <TouchableOpacity onPress={() => removeItem(globalIdx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={12} color="rgba(255,82,82,0.8)" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    <Text style={s.addedItemsTotal}>{formatPrice(Math.round(matTotal * 100) / 100)}</Text>
                  </View>
                )}

                {/* Expanded: dimension inputs */}
                {isExpanded && (
                  <View style={s.expandedArea}>
                    {/* Previously added items */}
                    {matItems.length > 0 && (
                      <View style={s.existingItems}>
                        {matItems.map((it, idx) => {
                          const globalIdx = items.indexOf(it);
                          const itSqm = parseFloat(it.width) * parseFloat(it.height);
                          return (
                            <View key={idx} style={s.existingItemRow}>
                              <View style={s.existingItemInfo}>
                                <Text style={s.existingItemSize}>{it.width} × {it.height} m</Text>
                                <Text style={s.existingItemCalc}>{itSqm.toFixed(2)} kv.m = {formatPrice(Math.round(itSqm * it.price_per_sqm * 100) / 100)}</Text>
                              </View>
                              <TouchableOpacity style={s.existingItemDel} onPress={() => removeItem(globalIdx)}>
                                <Trash2 size={14} color="#FF5252" />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Input row */}
                    <View style={s.inputArea}>
                      <View style={s.inputRow}>
                        <View style={s.inputWrap}>
                          <Text style={s.inputLabel}>En (m)</Text>
                          <TextInput
                            style={s.dimInput}
                            value={width}
                            onChangeText={setWidth}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="rgba(255,255,255,0.15)"
                          />
                        </View>
                        <Text style={s.multiplySign}>×</Text>
                        <View style={s.inputWrap}>
                          <Text style={s.inputLabel}>Bo'yi (m)</Text>
                          <TextInput
                            style={s.dimInput}
                            value={height}
                            onChangeText={setHeight}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="rgba(255,255,255,0.15)"
                          />
                        </View>
                        <TouchableOpacity
                          style={[s.quickAddBtn, sqm <= 0 && s.quickAddBtnDisabled]}
                          onPress={() => addItem(mat)}
                          disabled={sqm <= 0}
                        >
                          <Plus size={20} color={sqm > 0 ? '#000' : 'rgba(255,255,255,0.2)'} />
                        </TouchableOpacity>
                      </View>

                      {/* Live calculation */}
                      {currentSqm > 0 && (
                        <View style={s.liveCalc}>
                          <Text style={s.liveCalcText}>
                            {currentSqm.toFixed(2)} kv.m = {formatPrice(Math.round(currentPrice * 100) / 100)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {/* Spacer for bottom bar */}
          <View style={{ height: items.length > 0 ? 160 : 40 }} />
        </ScrollView>

        {/* Bottom order bar */}
        {items.length > 0 && (
          <View style={s.bottomBar}>
            {/* Notes toggle */}
            {showNotes && (
              <View style={s.notesArea}>
                <TextInput
                  style={s.notesInput}
                  placeholder="Izoh yozing..."
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            )}

            <View style={s.bottomContent}>
              <View style={s.bottomLeft}>
                <Text style={s.bottomLabel}>{items.length} mahsulot · {totalSqm.toFixed(1)} kv.m</Text>
                <Text style={s.bottomTotal}>{formatPrice(Math.round(totalPrice * 100) / 100)}</Text>
              </View>
              <View style={s.bottomActions}>
                <TouchableOpacity style={s.notesBtn} onPress={() => setShowNotes(!showNotes)}>
                  <StickyNote size={18} color={notes ? colors.accent : 'rgba(255,255,255,0.4)'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={submitOrder}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <Send size={16} color="#000" />
                      <Text style={s.submitBtnText}>Yuborish</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  countBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Success
  successBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginBottom: 8, paddingVertical: 14, backgroundColor: 'rgba(0,200,83,0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,200,83,0.15)' },
  successText: { color: '#00C853', fontSize: 15, fontWeight: '700' },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Material Card
  materialCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 10, overflow: 'hidden' },
  materialCardExpanded: { borderColor: 'rgba(108,99,255,0.3)', backgroundColor: 'rgba(108,99,255,0.04)' },
  materialCardWithItems: { borderColor: 'rgba(0,230,118,0.15)' },

  // Material Row
  materialRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  matImg: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#111' },
  matImgEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  matInfo: { flex: 1 },
  matName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  matMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  matPrice: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  matPriceUnit: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  matItemCountBadge: { backgroundColor: 'rgba(0,230,118,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  matItemCountText: { fontSize: 11, fontWeight: '700', color: colors.success },

  // Expand button
  expandBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  expandBtnActive: { backgroundColor: '#fff' },

  // Added items preview (collapsed)
  addedItemsPreview: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  addedItemChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,230,118,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,230,118,0.12)' },
  addedItemChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  addedItemsTotal: { fontSize: 13, fontWeight: '700', color: colors.success, marginLeft: 4 },

  // Expanded area
  expandedArea: { paddingHorizontal: 12, paddingBottom: 14 },

  // Existing items
  existingItems: { marginBottom: 10 },
  existingItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 6 },
  existingItemInfo: { flex: 1 },
  existingItemSize: { fontSize: 14, fontWeight: '600', color: '#fff' },
  existingItemCalc: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  existingItemDel: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,82,82,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Input area
  inputArea: {},
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputWrap: { flex: 1 },
  inputLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: '600' },
  dimInput: { height: 48, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, fontSize: 20, color: '#fff', textAlign: 'center', fontWeight: '300' },
  multiplySign: { fontSize: 20, color: 'rgba(255,255,255,0.15)', paddingBottom: 12 },
  quickAddBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  quickAddBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.06)' },

  // Live calc
  liveCalc: { marginTop: 8, alignItems: 'center' },
  liveCalcText: { fontSize: 13, color: colors.accent, fontWeight: '600' },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0a0a0f', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: Platform.OS === 'ios' ? 28 : 16 },
  notesArea: { paddingHorizontal: 16, paddingTop: 12 },
  notesInput: { minHeight: 40, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#fff' },
  bottomContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14 },
  bottomLeft: {},
  bottomLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  bottomTotal: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
  bottomActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notesBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  submitBtn: { height: 48, paddingHorizontal: 24, backgroundColor: '#fff', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },
});
