import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Check, X, Hash } from 'lucide-react-native';
import { api } from '../_layout';
import { colors, statusColors, statusLabels, formatPrice } from '../../src/utils/theme';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchOrders = useCallback(async () => {
    try { setOrders(await api('/orders')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId: string, status: string, reason?: string) => {
    try {
      await api(`/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, rejection_reason: reason || '' }) });
      fetchOrders(); setShowModal(false); setSelectedOrder(null); setRejectionReason('');
    } catch (e) { console.error(e); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const filters = ['all', 'kutilmoqda', 'tasdiqlangan', 'tayyorlanmoqda', 'tayyor', 'yetkazilmoqda', 'yetkazildi', 'rad_etilgan'];
  const filterLabels: Record<string, string> = { all: 'Barchasi', ...statusLabels };

  return (
    <SafeAreaView style={s.c}>
      <Text style={s.title}>Buyurtmalar</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        {filters.map(f => (
          <TouchableOpacity key={f} testID={`filter-${f}`} style={[s.filterBtn, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{filterLabels[f]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator size="large" color={colors.accent} style={{ flex: 1 }} /> : (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor="#fff" />} contentContainerStyle={s.scroll}>
          {filtered.length === 0 ? (
            <View style={s.empty}><Package size={48} color="rgba(255,255,255,0.08)" /><Text style={s.emptyText}>Buyurtmalar topilmadi</Text></View>
          ) : filtered.map(order => (
            <TouchableOpacity key={order.id} testID={`order-card-${order.id}`} style={s.orderCard} onPress={() => { setSelectedOrder(order); setShowModal(true); }} activeOpacity={0.75}>
              <View style={s.orderHead}>
                <View style={s.codeBadge}><Hash size={12} color={colors.accent} /><Text style={s.codeText}>{order.order_code}</Text></View>
                <View style={[s.statusBadge, { backgroundColor: (statusColors[order.status] || '#fff') + '18' }]}>
                  <View style={[s.statusDot, { backgroundColor: statusColors[order.status] }]} />
                  <Text style={[s.statusText, { color: statusColors[order.status] }]}>{statusLabels[order.status]}</Text>
                </View>
              </View>
              <View style={s.orderBody}>
                <View style={{ flex: 1 }}>
                  <Text style={s.dealerName}>{order.dealer_name}</Text>
                  <Text style={s.orderDate}>{(() => { const d = new Date(order.created_at); return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}  ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; })()}</Text>
                </View>
                <View style={s.priceBox}>
                  <Text style={s.orderPrice}>{formatPrice(order.total_price)}</Text>
                  <Text style={s.orderSqm}>{order.total_sqm} kv.m</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {/* Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modal}>
            <View style={s.modalH}>
              <Text style={s.modalTitle}>Buyurtma</Text>
              <TouchableOpacity testID="close-order-modal" onPress={() => { setShowModal(false); setSelectedOrder(null); }}>
                <X size={22} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            {selectedOrder && (
              <ScrollView style={s.modalBody}>
                <View style={s.modalCodeRow}>
                  <Hash size={14} color={colors.accent} />
                  <Text style={s.modalCode}>{selectedOrder.order_code}</Text>
                </View>
                <Text style={s.ml}>Diler: <Text style={s.mlBold}>{selectedOrder.dealer_name}</Text></Text>
                <Text style={s.ml}>Sana: {new Date(selectedOrder.created_at).toLocaleDateString('uz-UZ')}</Text>
                <Text style={s.ml}>Status: <Text style={{ color: statusColors[selectedOrder.status] }}>{statusLabels[selectedOrder.status]}</Text></Text>
                <Text style={s.ml}>Jami: <Text style={s.mlBold}>{formatPrice(selectedOrder.total_price)}</Text> ({selectedOrder.total_sqm} kv.m)</Text>
                <Text style={s.itemsTitle}>Mahsulotlar</Text>
                {selectedOrder.items?.map((item: any, i: number) => (
                  <View key={i} style={s.itemRow}>
                    <Text style={s.itemName}>{item.material_name}</Text>
                    <Text style={s.itemDetail}>{item.width}m x {item.height}m = {item.sqm} kv.m</Text>
                    <Text style={s.itemPrice}>{formatPrice(item.price)}</Text>
                  </View>
                ))}
                {selectedOrder.status === 'kutilmoqda' && (
                  <>
                    <View style={s.actionRow}>
                      <TouchableOpacity testID="approve-order-btn" style={s.approveBtn} onPress={() => updateStatus(selectedOrder.id, 'tasdiqlangan')}>
                        <Check size={16} color="#fff" /><Text style={s.approveBtnText}>Tasdiqlash</Text>
                      </TouchableOpacity>
                      <TouchableOpacity testID="reject-order-btn" style={s.rejectBtn} onPress={() => { if (rejectionReason.trim()) updateStatus(selectedOrder.id, 'rad_etilgan', rejectionReason); }}>
                        <X size={16} color={colors.danger} /><Text style={s.rejectBtnText}>Rad etish</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput testID="rejection-reason-input" style={s.reasonInput} placeholder="Rad etish sababi..." placeholderTextColor="rgba(255,255,255,0.2)" value={rejectionReason} onChangeText={setRejectionReason} />
                  </>
                )}
                {selectedOrder.status === 'tasdiqlangan' && (
                  <TouchableOpacity testID="prepare-order-btn" style={s.approveBtn} onPress={() => updateStatus(selectedOrder.id, 'tayyorlanmoqda')}>
                    <Text style={s.approveBtnText}>Tayyorlashga o'tkazish</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  filterRow: { maxHeight: 50, marginTop: 16 },
  filterContent: { paddingHorizontal: 24, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  filterActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(108,99,255,0.3)' },
  filterText: { fontSize: 12, color: colors.textSec, fontWeight: '600' },
  filterTextActive: { color: colors.accent },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textTer },
  orderCard: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.cardBorder, padding: 18, marginBottom: 12 },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  codeText: { fontSize: 14, fontWeight: '800', color: colors.accent, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderBody: { flexDirection: 'row', alignItems: 'center' },
  dealerName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  orderDate: { fontSize: 12, color: colors.textTer, marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  orderPrice: { fontSize: 17, fontWeight: '800', color: '#fff' },
  orderSqm: { fontSize: 11, color: colors.textSec, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#0a0a0f', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: '82%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalBody: { padding: 22 },
  modalCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginBottom: 16 },
  modalCode: { fontSize: 18, fontWeight: '800', color: colors.accent, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  ml: { fontSize: 14, color: colors.textSec, marginBottom: 6, lineHeight: 20 },
  mlBold: { fontWeight: '700', color: '#fff' },
  itemsTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  itemDetail: { fontSize: 12, color: colors.textSec, marginTop: 3 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  approveBtn: { flex: 1, height: 50, backgroundColor: colors.accent, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  rejectBtn: { flex: 1, height: 50, backgroundColor: colors.dangerSoft, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,82,82,0.25)' },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: colors.danger },
  reasonInput: { height: 48, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 16, fontSize: 14, color: '#fff', marginTop: 12 },
});
