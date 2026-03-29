import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, ChevronDown, Check, X, AlertTriangle } from 'lucide-react-native';
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
    try {
      const data = await api('/orders');
      setOrders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId: string, status: string, reason?: string) => {
    try {
      await api(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, rejection_reason: reason || '' }),
      });
      fetchOrders();
      setShowModal(false);
      setSelectedOrder(null);
      setRejectionReason('');
    } catch (e) { console.error(e); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const filters = ['all', 'kutilmoqda', 'tasdiqlangan', 'tayyorlanmoqda', 'yetkazildi', 'rad_etilgan'];
  const filterLabels: Record<string, string> = { all: 'Barchasi', ...statusLabels };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Buyurtmalar</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {filters.map(f => (
          <TouchableOpacity
            key={f} testID={`filter-${f}`}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {filterLabels[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor="#fff" />}
          contentContainerStyle={styles.scrollContent}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>Buyurtmalar topilmadi</Text>
            </View>
          ) : filtered.map(order => (
            <TouchableOpacity
              key={order.id} testID={`order-card-${order.id}`}
              style={styles.orderCard}
              onPress={() => { setSelectedOrder(order); setShowModal(true); }}
              activeOpacity={0.7}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderDealer}>{order.dealer_name}</Text>
                  <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('uz-UZ')}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (statusColors[order.status] || '#fff') + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColors[order.status] }]} />
                  <Text style={[styles.statusText, { color: statusColors[order.status] }]}>{statusLabels[order.status]}</Text>
                </View>
              </View>
              <View style={styles.orderDetails}>
                <Text style={styles.orderDetailText}>{order.items?.length || 0} ta mahsulot</Text>
                <Text style={styles.orderPrice}>{formatPrice(order.total_price)}</Text>
              </View>
              <Text style={styles.orderSqm}>{order.total_sqm} kv.m</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buyurtma</Text>
              <TouchableOpacity testID="close-order-modal" onPress={() => { setShowModal(false); setSelectedOrder(null); }}>
                <X size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Diler: {selectedOrder.dealer_name}</Text>
                <Text style={styles.modalLabel}>Sana: {new Date(selectedOrder.created_at).toLocaleDateString('uz-UZ')}</Text>
                <Text style={styles.modalLabel}>Status: {statusLabels[selectedOrder.status]}</Text>
                <Text style={styles.modalLabel}>Jami: {formatPrice(selectedOrder.total_price)} ({selectedOrder.total_sqm} kv.m)</Text>

                <Text style={styles.itemsTitle}>Mahsulotlar:</Text>
                {selectedOrder.items?.map((item: any, i: number) => (
                  <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.material_name}</Text>
                    <Text style={styles.itemDetail}>{item.width}m x {item.height}m = {item.sqm} kv.m</Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                  </View>
                ))}

                {selectedOrder.status === 'kutilmoqda' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      testID="approve-order-btn"
                      style={styles.approveBtn}
                      onPress={() => updateStatus(selectedOrder.id, 'tasdiqlangan')}
                    >
                      <Check size={18} color="#000" />
                      <Text style={styles.approveBtnText}>Tasdiqlash</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="reject-order-btn"
                      style={styles.rejectBtn}
                      onPress={() => {
                        if (!rejectionReason.trim()) return;
                        updateStatus(selectedOrder.id, 'rad_etilgan', rejectionReason);
                      }}
                    >
                      <X size={18} color="#FF5252" />
                      <Text style={styles.rejectBtnText}>Rad etish</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {selectedOrder.status === 'kutilmoqda' && (
                  <TextInput
                    testID="rejection-reason-input"
                    style={styles.reasonInput}
                    placeholder="Rad etish sababi..."
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                  />
                )}
                {selectedOrder.status === 'tasdiqlangan' && (
                  <TouchableOpacity
                    testID="prepare-order-btn"
                    style={styles.approveBtn}
                    onPress={() => updateStatus(selectedOrder.id, 'tayyorlanmoqda')}
                  >
                    <Text style={styles.approveBtnText}>Tayyorlashga o'tkazish</Text>
                  </TouchableOpacity>
                )}
                {selectedOrder.status === 'tayyorlanmoqda' && (
                  <TouchableOpacity
                    testID="deliver-order-btn"
                    style={styles.approveBtn}
                    onPress={() => updateStatus(selectedOrder.id, 'yetkazildi')}
                  >
                    <Text style={styles.approveBtnText}>Yetkazildi</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '300', color: '#fff', paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  filterRow: { maxHeight: 50, marginTop: 16 },
  filterContent: { paddingHorizontal: 24, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  filterBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' },
  filterText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  filterTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 18, marginBottom: 12,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderInfo: { flex: 1 },
  orderDealer: { fontSize: 16, fontWeight: '500', color: '#fff' },
  orderDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  orderDetailText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  orderPrice: { fontSize: 16, fontWeight: '500', color: '#fff' },
  orderSqm: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modalCard: {
    backgroundColor: '#0a0a0a', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: { fontSize: 18, fontWeight: '500', color: '#fff' },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  itemsTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 16, marginBottom: 8 },
  itemRow: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8,
  },
  itemName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  itemDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '500', color: '#fff', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  approveBtn: {
    flex: 1, height: 48, backgroundColor: '#fff', borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
  },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  rejectBtn: {
    flex: 1, height: 48, backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,82,82,0.3)',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: '#FF5252' },
  reasonInput: {
    height: 48, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16,
    fontSize: 14, color: '#fff', marginTop: 12,
  },
});
