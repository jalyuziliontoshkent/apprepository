import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Check, X, Hash, Clock, User, Layers, ChevronRight, Truck, MapPin } from 'lucide-react-native';
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
  const filterCounts: Record<string, number> = { all: orders.length };
  filters.forEach(f => { if (f !== 'all') filterCounts[f] = orders.filter(o => o.status === f).length; });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}  ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={s.c}>
      <Text style={s.title}>Buyurtmalar</Text>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        {filters.map(f => (
          <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {filterLabels[f]} {filterCounts[f] > 0 ? `(${filterCounts[f]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator size="large" color={colors.accent} style={{ flex: 1 }} /> : (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor="#fff" />} contentContainerStyle={s.scroll}>
          {filtered.length === 0 ? (
            <View style={s.empty}><Package size={48} color="rgba(255,255,255,0.08)" /><Text style={s.emptyText}>Buyurtmalar topilmadi</Text></View>
          ) : filtered.map(order => (
            <TouchableOpacity key={order.id} style={s.orderCard} onPress={() => { setSelectedOrder(order); setShowModal(true); }} activeOpacity={0.75}>
              {/* Top row: code + status */}
              <View style={s.orderHead}>
                <View style={s.codeBadge}>
                  <Hash size={12} color={colors.accent} />
                  <Text style={s.codeText}>{order.order_code}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: (statusColors[order.status] || '#fff') + '18' }]}>
                  <View style={[s.statusDot, { backgroundColor: statusColors[order.status] }]} />
                  <Text style={[s.statusText, { color: statusColors[order.status] }]}>{statusLabels[order.status]}</Text>
                </View>
              </View>

              {/* Items preview */}
              <View style={s.itemsPreview}>
                {(order.items || []).slice(0, 3).map((item: any, i: number) => (
                  <View key={i} style={s.itemPreviewRow}>
                    <View style={s.itemDot} />
                    <Text style={s.itemPreviewName} numberOfLines={1}>{item.material_name}</Text>
                    <Text style={s.itemPreviewSize}>{item.width}×{item.height}m</Text>
                    <Text style={s.itemPreviewPrice}>{formatPrice(item.price || 0)}</Text>
                  </View>
                ))}
                {(order.items || []).length > 3 && (
                  <Text style={s.moreItems}>+{order.items.length - 3} ta yana...</Text>
                )}
              </View>

              {/* Footer: dealer + price */}
              <View style={s.orderFoot}>
                <View style={s.dealerRow}>
                  <User size={12} color="rgba(255,255,255,0.3)" />
                  <Text style={s.dealerName}>{order.dealer_name}</Text>
                  <Text style={s.orderDate}>{formatDate(order.created_at)}</Text>
                </View>
                <View style={s.priceBox}>
                  <Text style={s.orderPrice}>{formatPrice(order.total_price)}</Text>
                  <Text style={s.orderSqm}>{order.total_sqm?.toFixed(1)} kv.m</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Order Detail Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modal}>
            <View style={s.modalH}>
              <Text style={s.modalTitle}>Buyurtma tafsiloti</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setSelectedOrder(null); }}>
                <X size={22} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            {selectedOrder && (
              <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                {/* Order code */}
                <View style={s.modalCodeRow}>
                  <Hash size={16} color={colors.accent} />
                  <Text style={s.modalCode}>{selectedOrder.order_code}</Text>
                </View>

                {/* Info grid */}
                <View style={s.infoGrid}>
                  <View style={s.infoItem}>
                    <User size={14} color="rgba(255,255,255,0.3)" />
                    <Text style={s.infoLabel}>Diler</Text>
                    <Text style={s.infoValue}>{selectedOrder.dealer_name}</Text>
                  </View>
                  <View style={s.infoItem}>
                    <Clock size={14} color="rgba(255,255,255,0.3)" />
                    <Text style={s.infoLabel}>Sana</Text>
                    <Text style={s.infoValue}>{formatDate(selectedOrder.created_at)}</Text>
                  </View>
                  <View style={s.infoItem}>
                    <Layers size={14} color="rgba(255,255,255,0.3)" />
                    <Text style={s.infoLabel}>Maydon</Text>
                    <Text style={s.infoValue}>{selectedOrder.total_sqm?.toFixed(2)} kv.m</Text>
                  </View>
                  <View style={s.infoItem}>
                    <View style={[s.statusDotLg, { backgroundColor: statusColors[selectedOrder.status] }]} />
                    <Text style={s.infoLabel}>Status</Text>
                    <Text style={[s.infoValue, { color: statusColors[selectedOrder.status] }]}>{statusLabels[selectedOrder.status]}</Text>
                  </View>
                </View>

                {/* Total */}
                <View style={s.totalBanner}>
                  <Text style={s.totalLabel}>Jami narx</Text>
                  <Text style={s.totalValue}>{formatPrice(selectedOrder.total_price)}</Text>
                </View>

                {/* Items */}
                <Text style={s.sectionTitle}>Mahsulotlar ({selectedOrder.items?.length || 0})</Text>
                {selectedOrder.items?.map((item: any, i: number) => (
                  <View key={i} style={s.itemCard}>
                    <View style={s.itemCardHead}>
                      <Text style={s.itemCardName}>{item.material_name}</Text>
                      <Text style={s.itemCardPrice}>{formatPrice(item.price || 0)}</Text>
                    </View>
                    <View style={s.itemCardMeta}>
                      <View style={s.metaChip}>
                        <Text style={s.metaChipText}>{item.width} × {item.height} m</Text>
                      </View>
                      <View style={s.metaChip}>
                        <Text style={s.metaChipText}>{item.sqm?.toFixed(2)} kv.m</Text>
                      </View>
                      <View style={s.metaChip}>
                        <Text style={s.metaChipText}>{formatPrice(item.price_per_sqm)}/kv.m</Text>
                      </View>
                    </View>
                    {item.assigned_worker_name ? (
                      <View style={s.workerAssigned}>
                        <User size={12} color={colors.accent} />
                        <Text style={s.workerAssignedText}>{item.assigned_worker_name}</Text>
                        <View style={[s.workerStatusDot, { backgroundColor: item.worker_status === 'completed' ? colors.success : colors.warning }]} />
                        <Text style={[s.workerStatusText, { color: item.worker_status === 'completed' ? colors.success : colors.warning }]}>
                          {item.worker_status === 'completed' ? 'Tayyor' : item.worker_status === 'assigned' ? 'Tayinlangan' : 'Kutilmoqda'}
                        </Text>
                      </View>
                    ) : null}
                    {item.notes ? <Text style={s.itemNotes}>{item.notes}</Text> : null}
                  </View>
                ))}

                {/* Notes */}
                {selectedOrder.notes ? (
                  <View style={s.orderNotes}>
                    <Text style={s.orderNotesLabel}>Izoh</Text>
                    <Text style={s.orderNotesText}>{selectedOrder.notes}</Text>
                  </View>
                ) : null}

                {/* Delivery info */}
                {selectedOrder.delivery_info && (
                  <View style={s.deliveryBox}>
                    <View style={s.deliveryHead}>
                      <Truck size={14} color={colors.blue} />
                      <Text style={s.deliveryTitle}>Yetkazish ma'lumoti</Text>
                    </View>
                    <Text style={s.deliveryText}>Haydovchi: {selectedOrder.delivery_info.driver_name}</Text>
                    <Text style={s.deliveryText}>Tel: {selectedOrder.delivery_info.driver_phone}</Text>
                    {selectedOrder.delivery_info.plate_number ? <Text style={s.deliveryText}>Raqam: {selectedOrder.delivery_info.plate_number}</Text> : null}
                  </View>
                )}

                {/* Actions */}
                {selectedOrder.status === 'kutilmoqda' && (
                  <View>
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.approveBtn} onPress={() => updateStatus(selectedOrder.id, 'tasdiqlangan')}>
                        <Check size={16} color="#fff" /><Text style={s.approveBtnText}>Tasdiqlash</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.rejectBtn} onPress={() => { if (rejectionReason.trim()) updateStatus(selectedOrder.id, 'rad_etilgan', rejectionReason); }}>
                        <X size={16} color={colors.danger} /><Text style={s.rejectBtnText}>Rad etish</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput style={s.reasonInput} placeholder="Rad etish sababi..." placeholderTextColor="rgba(255,255,255,0.2)" value={rejectionReason} onChangeText={setRejectionReason} />
                  </View>
                )}
                {selectedOrder.status === 'tasdiqlangan' && (
                  <TouchableOpacity style={s.approveBtn} onPress={() => updateStatus(selectedOrder.id, 'tayyorlanmoqda')}>
                    <Text style={s.approveBtnText}>Tayyorlashga o'tkazish</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 30 }} />
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
  title: { fontSize: 26, fontWeight: '800', color: '#fff', paddingHorizontal: 20, paddingTop: 16, letterSpacing: -0.5 },

  // Filters
  filterRow: { maxHeight: 48, marginTop: 14 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  filterActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(108,99,255,0.3)' },
  filterText: { fontSize: 12, color: colors.textSec, fontWeight: '600' },
  filterTextActive: { color: colors.accent },

  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textTer },

  // Order Card
  orderCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 10 },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  codeText: { fontSize: 13, fontWeight: '800', color: colors.accent, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Items preview in card
  itemsPreview: { marginBottom: 12 },
  itemPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  itemDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  itemPreviewName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  itemPreviewSize: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  itemPreviewPrice: { fontSize: 13, color: '#fff', fontWeight: '700', minWidth: 60, textAlign: 'right' },
  moreItems: { fontSize: 11, color: colors.accent, fontWeight: '600', marginTop: 2, paddingLeft: 12 },

  // Footer
  orderFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  dealerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dealerName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  orderDate: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 4 },
  priceBox: { alignItems: 'flex-end' },
  orderPrice: { fontSize: 18, fontWeight: '800', color: '#fff' },
  orderSqm: { fontSize: 11, color: colors.textSec, marginTop: 1 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#0a0a0f', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: '90%' },
  modalH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalBody: { padding: 20 },
  modalCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginBottom: 16 },
  modalCode: { fontSize: 18, fontWeight: '800', color: colors.accent, letterSpacing: 2, fontVariant: ['tabular-nums'] },

  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoItem: { width: '47%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 12, gap: 4 },
  infoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#fff', fontWeight: '600' },
  statusDotLg: { width: 8, height: 8, borderRadius: 4 },

  // Total
  totalBanner: { backgroundColor: 'rgba(108,99,255,0.08)', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(108,99,255,0.15)' },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '800', color: '#fff' },

  // Section title
  sectionTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Item cards
  itemCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  itemCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemCardName: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
  itemCardPrice: { fontSize: 16, fontWeight: '800', color: '#fff' },
  itemCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaChipText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  // Worker assigned
  workerAssigned: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  workerAssignedText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  workerStatusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  workerStatusText: { fontSize: 11, fontWeight: '600' },

  itemNotes: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6, fontStyle: 'italic' },

  // Order notes
  orderNotes: { backgroundColor: 'rgba(255,179,0,0.06)', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,179,0,0.1)' },
  orderNotesLabel: { fontSize: 10, fontWeight: '700', color: colors.warning, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  orderNotesText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },

  // Delivery
  deliveryBox: { backgroundColor: 'rgba(68,138,255,0.06)', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(68,138,255,0.1)' },
  deliveryHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  deliveryTitle: { fontSize: 12, fontWeight: '700', color: colors.blue, textTransform: 'uppercase', letterSpacing: 0.5 },
  deliveryText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  approveBtn: { flex: 1, height: 50, backgroundColor: colors.accent, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  rejectBtn: { flex: 1, height: 50, backgroundColor: colors.dangerSoft, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,82,82,0.25)' },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: colors.danger },
  reasonInput: { height: 48, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 16, fontSize: 14, color: '#fff', marginTop: 12 },
});
