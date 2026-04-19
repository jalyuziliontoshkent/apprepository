import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Check,
  Clock,
  FileSpreadsheet,
  Hash,
  Layers,
  Package,
  Truck,
  User,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, backendUrl } from '../../src/services/apiClient';
import { getStatusColor, statusLabels, useCurrency, useTheme } from '../../src/utils/theme';

const filters = ['all', 'kutilmoqda', 'tasdiqlangan', 'tayyorlanmoqda', 'tayyor', 'yetkazilmoqda', 'yetkazildi', 'rad_etilgan'];
const filterLabels: Record<string, string> = { all: 'Barchasi', ...statusLabels };

export default function AdminOrders() {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { formatPrice } = useCurrency();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setOrders(await api('/orders', { cacheKey: 'admin-orders', cacheTtlMs: 20_000 }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = useCallback(async (orderId: string, status: string, reason?: string) => {
    try {
      await api(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, rejection_reason: reason || '' }),
      });
      fetchOrders();
      setShowModal(false);
      setSelectedOrder(null);
      setRejectionReason('');
    } catch (e) {
      console.error(e);
    }
  }, [fetchOrders]);

  const exportToExcel = useCallback(async () => {
    setExporting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Token topilmadi');
      }

      const exportUrl = `${backendUrl}/api/reports/export-orders`;

      if (Platform.OS === 'web') {
        const res = await fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          throw new Error('Excel yuklab bo`lmadi');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'buyurtmalar.xlsx';
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${(FileSystem as any).documentDirectory || ''}buyurtmalar.xlsx`;
        const res = await FileSystem.downloadAsync(exportUrl, fileUri, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(res.uri);
        } else {
          Alert.alert('Tayyor', `Fayl saqlandi: ${res.uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert('Xatolik', e.message || 'Export xatosi');
    } finally {
      setExporting(false);
    }
  }, []);

  const filteredOrders = filter === 'all' ? orders : orders.filter((order) => order.status === filter);
  const filterCounts: Record<string, number> = { all: orders.length };
  filters.forEach((item) => {
    if (item !== 'all') {
      filterCounts[item] = orders.filter((order) => order.status === item).length;
    }
  });

  const formatDate = useCallback((value: string) => {
    const date = new Date(value);
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  const getOrderCode = useCallback((order: any, index: number) => {
    const existing = String(order?.order_code || '').trim().toUpperCase();
    if (existing) {
      return existing;
    }

    const raw = String(order?.id || index + 1).replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return raw.slice(-8).padStart(8, '0');
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={c.accent} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Buyurtmalar</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={exportToExcel}
          disabled={exporting}
        >
          {exporting ? <ActivityIndicator size="small" color={c.success} /> : <FileSpreadsheet size={18} color={c.success} />}
          <Text style={styles.exportText}>Excel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((item) => {
          const active = filter === item;
          const suffix = filterCounts[item] > 0 ? ` (${filterCounts[item]})` : '';

          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {filterLabels[item]}
                {suffix}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOrders();
            }}
            tintColor={c.text}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Package size={42} color={c.textTer} />
            <Text style={styles.emptyText}>Buyurtmalar topilmadi</Text>
          </View>
        ) : (
          filteredOrders.map((order, index) => {
            const code = getOrderCode(order, index);
            const tone = getStatusColor(order.status, c);
            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <TouchableOpacity
                key={order.id || `${code}-${index}`}
                style={styles.orderCard}
                activeOpacity={0.82}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowModal(true);
                }}
              >
                <View style={styles.orderHead}>
                  <View style={styles.codeBadge}>
                    <Hash size={12} color={c.accent} />
                    <Text style={styles.codeText}># {code}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${tone}18` }]}>
                    <View style={[styles.statusDot, { backgroundColor: tone }]} />
                    <Text style={[styles.statusText, { color: tone }]}>
                      {statusLabels[order.status] || order.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsWrap}>
                  <View style={styles.itemsColumn}>
                    {items.slice(0, 3).map((item: any, itemIndex: number) => (
                      <View key={`${code}-${itemIndex}`} style={styles.itemRow}>
                        <Text style={styles.itemBullet}>•</Text>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.material_name || 'Material'}
                        </Text>
                      </View>
                    ))}
                    {items.length > 3 ? (
                      <Text style={styles.moreItems}>+{items.length - 3} ta yana...</Text>
                    ) : null}
                  </View>

                  <View style={styles.priceColumn}>
                    {items.slice(0, 3).map((item: any, itemIndex: number) => (
                      <View key={`${code}-price-${itemIndex}`} style={styles.priceRow}>
                        <Text style={styles.itemSize}>
                          {item.width}x{item.height}m
                        </Text>
                        <Text style={styles.itemPrice}>{formatPrice(item.price || 0)}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.footerRow}>
                  <View style={styles.dealerBlock}>
                    <View style={styles.dealerMeta}>
                      <User size={12} color={c.textTer} />
                      <Text style={styles.dealerName}>{order.dealer_name || 'Diler'}</Text>
                    </View>
                    <Text style={styles.dealerDate}>{formatDate(order.created_at)}</Text>
                  </View>

                  <View style={styles.totalBlock}>
                    <Text style={styles.totalValue}>{formatPrice(order.total_price || 0)}</Text>
                    <Text style={styles.totalMeta}>{Number(order.total_sqm || 0).toFixed(1)} kv.m</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buyurtma tafsiloti</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setSelectedOrder(null);
                }}
              >
                <X size={22} color={c.textSec} />
              </TouchableOpacity>
            </View>

            {selectedOrder ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                <View style={styles.modalCodeBadge}>
                  <Hash size={15} color={c.accent} />
                  <Text style={styles.modalCodeText}># {getOrderCode(selectedOrder, 0)}</Text>
                </View>

                <View style={styles.infoGrid}>
                  {[
                    { icon: User, label: 'Diler', value: selectedOrder.dealer_name || 'Diler' },
                    { icon: Clock, label: 'Sana', value: formatDate(selectedOrder.created_at) },
                    { icon: Layers, label: 'Maydon', value: `${Number(selectedOrder.total_sqm || 0).toFixed(2)} kv.m` },
                    { icon: Truck, label: 'Status', value: statusLabels[selectedOrder.status] || selectedOrder.status },
                  ].map((item, index) => (
                    <View key={`${item.label}-${index}`} style={styles.infoCard}>
                      <item.icon size={14} color={c.textTer} />
                      <Text style={styles.infoLabel}>{item.label}</Text>
                      <Text style={styles.infoValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalBanner}>
                  <Text style={styles.totalBannerLabel}>Jami narx</Text>
                  <Text style={styles.totalBannerValue}>{formatPrice(selectedOrder.total_price || 0)}</Text>
                </View>

                <Text style={styles.modalSectionTitle}>
                  Mahsulotlar ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})
                </Text>

                {(selectedOrder.items || []).map((item: any, index: number) => (
                  <View key={`${selectedOrder.id}-${index}`} style={styles.modalItemCard}>
                    <View style={styles.modalItemHead}>
                      <Text style={styles.modalItemName}>{item.material_name || 'Material'}</Text>
                      <Text style={styles.modalItemPrice}>{formatPrice(item.price || 0)}</Text>
                    </View>

                    <View style={styles.modalItemMeta}>
                      {[`${item.width} x ${item.height} m`, `${Number(item.sqm || 0).toFixed(2)} kv.m`, `${formatPrice(item.price_per_sqm || 0)}/kv.m`].map((meta, metaIndex) => (
                        <View key={`${selectedOrder.id}-${index}-${metaIndex}`} style={styles.metaChip}>
                          <Text style={styles.metaChipText}>{meta}</Text>
                        </View>
                      ))}
                    </View>

                    {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
                  </View>
                ))}

                {selectedOrder.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesTitle}>Izoh</Text>
                    <Text style={styles.notesText}>{selectedOrder.notes}</Text>
                  </View>
                ) : null}

                {selectedOrder.delivery_info ? (
                  <View style={styles.deliveryBox}>
                    <View style={styles.deliveryHeader}>
                      <Truck size={14} color={c.blue} />
                      <Text style={styles.deliveryTitle}>Yetkazish</Text>
                    </View>
                    <Text style={styles.deliveryText}>
                      Haydovchi: {selectedOrder.delivery_info.driver_name}
                      {'\n'}
                      Tel: {selectedOrder.delivery_info.driver_phone}
                      {selectedOrder.delivery_info.plate_number ? `\nRaqam: ${selectedOrder.delivery_info.plate_number}` : ''}
                    </Text>
                  </View>
                ) : null}

                {selectedOrder.status === 'kutilmoqda' ? (
                  <>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => updateStatus(selectedOrder.id, 'tasdiqlangan')}
                      >
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Tasdiqlash</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => {
                          if (rejectionReason.trim()) {
                            updateStatus(selectedOrder.id, 'rad_etilgan', rejectionReason);
                          }
                        }}
                      >
                        <X size={16} color={c.danger} />
                        <Text style={styles.rejectButtonText}>Rad etish</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.reasonInput}
                      placeholder="Rad etish sababi..."
                      placeholderTextColor={c.placeholder}
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                    />
                  </>
                ) : null}

                {selectedOrder.status === 'tasdiqlangan' ? (
                  <TouchableOpacity
                    style={[styles.approveButton, styles.singleActionButton]}
                    onPress={() => updateStatus(selectedOrder.id, 'tayyorlanmoqda')}
                  >
                    <Text style={styles.primaryButtonText}>Tayyorlashga o'tkazish</Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            ) : null}
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
  headerRow: {
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(14,72,41,0.48)',
    borderColor: 'rgba(34,198,122,0.18)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  exportText: {
    color: c.success,
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    maxHeight: 54,
    marginTop: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#10131A',
    borderColor: c.cardBorder,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(108,99,255,0.18)',
    borderColor: 'rgba(108,99,255,0.35)',
  },
  filterLabel: {
    color: c.textSec,
    fontSize: 13,
    fontWeight: '700',
  },
  filterLabelActive: {
    color: c.accent,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
    gap: 14,
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
  orderCard: {
    backgroundColor: '#0E1015',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 16,
  },
  orderHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(108,99,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  codeText: {
    color: c.accent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemsWrap: {
    flexDirection: 'row',
    gap: 12,
  },
  itemsColumn: {
    flex: 1,
    gap: 10,
  },
  priceColumn: {
    width: 118,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemBullet: {
    color: c.textTer,
    fontSize: 14,
    lineHeight: 14,
  },
  itemName: {
    flex: 1,
    color: c.text,
    fontSize: 15,
    fontWeight: '600',
  },
  moreItems: {
    color: c.accent,
    fontSize: 13,
    fontWeight: '700',
    paddingLeft: 12,
  },
  priceRow: {
    alignItems: 'flex-end',
    gap: 2,
  },
  itemSize: {
    color: c.textTer,
    fontSize: 12,
    fontWeight: '500',
  },
  itemPrice: {
    color: c.text,
    fontSize: 15,
    fontWeight: '800',
  },
  footerRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  dealerBlock: {
    flex: 1,
    gap: 4,
  },
  dealerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealerName: {
    color: c.text,
    fontSize: 15,
    fontWeight: '600',
  },
  dealerDate: {
    color: c.textTer,
    fontSize: 12,
  },
  totalBlock: {
    alignItems: 'flex-end',
  },
  totalValue: {
    color: c.text,
    fontSize: 18,
    fontWeight: '900',
  },
  totalMeta: {
    color: c.textSec,
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  modalCard: {
    maxHeight: '90%',
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
  modalContent: {
    padding: 20,
    paddingBottom: 36,
  },
  modalCodeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(108,99,255,0.16)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
  },
  modalCodeText: {
    color: c.accent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoCard: {
    width: '48%',
    backgroundColor: '#11141C',
    borderRadius: 18,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  infoLabel: {
    color: c.textTer,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: c.text,
    fontSize: 14,
    fontWeight: '600',
  },
  totalBanner: {
    marginTop: 16,
    marginBottom: 18,
    backgroundColor: 'rgba(108,99,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.18)',
    padding: 16,
  },
  totalBannerLabel: {
    color: c.textSec,
    fontSize: 13,
    fontWeight: '700',
  },
  totalBannerValue: {
    color: c.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  modalSectionTitle: {
    color: c.textSec,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  modalItemCard: {
    backgroundColor: '#11141C',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  modalItemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  modalItemName: {
    flex: 1,
    color: c.text,
    fontSize: 15,
    fontWeight: '700',
  },
  modalItemPrice: {
    color: c.text,
    fontSize: 16,
    fontWeight: '800',
  },
  modalItemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    backgroundColor: c.inputBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: {
    color: c.textSec,
    fontSize: 11,
    fontWeight: '600',
  },
  itemNotes: {
    color: c.textTer,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 10,
  },
  notesBox: {
    backgroundColor: c.warningSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${c.warning}22`,
    padding: 14,
    marginTop: 8,
  },
  notesTitle: {
    color: c.warning,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  notesText: {
    color: c.textSec,
    fontSize: 13,
    lineHeight: 19,
  },
  deliveryBox: {
    backgroundColor: c.blueSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${c.blue}24`,
    padding: 14,
    marginTop: 10,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  deliveryTitle: {
    color: c.blue,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  deliveryText: {
    color: c.textSec,
    fontSize: 13,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  approveButton: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    backgroundColor: c.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  rejectButton: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: `${c.danger}26`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectButtonText: {
    color: c.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  reasonInput: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.inputBorder,
    backgroundColor: c.inputBg,
    color: c.text,
    paddingHorizontal: 16,
    fontSize: 14,
    marginTop: 12,
  },
  singleActionButton: {
    marginTop: 18,
  },
});
