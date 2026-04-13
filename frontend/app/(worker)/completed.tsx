import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Hash, Ruler } from 'lucide-react-native';
import { api } from '../_layout';
import { useTheme } from '../../src/utils/theme';
import { SectionCard } from '../../src/components/SectionCard';
import { StateView } from '../../src/components/StateView';

export default function WorkerCompleted() {
  const c = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      setError('');
      const data = await api('/worker/tasks', { cacheKey: 'worker-tasks-completed', cacheTtlMs: 15000 });
      setTasks(data.filter((t: any) => t.worker_status === 'completed'));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Bajarilgan ishlar yuklanmadi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (loading) {
    return (
      <SafeAreaView style={s.c}>
        <View style={s.centerWrap}>
          <StateView title="Tarix yuklanmoqda" message="Bajarilgan topshiriqlar tayyorlanmoqda." loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c}>
      <Text style={s.title}>Bajarilgan</Text>
      <View style={s.countRow}>
        <View style={s.countCard}>
          <Text style={s.countVal}>{tasks.length}</Text>
          <Text style={s.countLabel}>Bajarilgan vazifalar</Text>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor={c.text} />}
        contentContainerStyle={s.scroll}
      >
        {error ? (
          <StateView title="Yuklashda xatolik" message={error} actionLabel="Qayta urinish" onAction={fetchTasks} />
        ) : tasks.length === 0 ? (
          <StateView title="Hali tarix bo'sh" message="Birinchi vazifa tugagach, u shu yerga tushadi." />
        ) : (
          <SectionCard title="Yakunlangan ishlar" subtitle="Tugatib bo'lingan topshiriqlar ro'yxati">
            {tasks.map((task, i) => (
              <View key={`${task.order_id}-${task.item_index}`} style={s.card} testID={`completed-${i}`}>
                <View style={s.cardHead}>
                  <View style={s.codeBadge}>
                    <Hash size={11} color={c.success} />
                    <Text style={s.codeText}>{task.order_code}</Text>
                  </View>
                  <View style={s.doneBadge}>
                    <CheckCircle size={12} color={c.success} />
                    <Text style={s.doneText}>Bajarildi</Text>
                  </View>
                </View>
                <Text style={s.material}>{task.material_name}</Text>
                <View style={s.sizeRow}>
                  <Ruler size={14} color={c.textSec} />
                  <Text style={s.size}>{task.width}m x {task.height}m = {task.sqm} kv.m</Text>
                </View>
              </View>
            ))}
          </SectionCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  c: { flex: 1, backgroundColor: c.bg },
  centerWrap: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: c.text, paddingHorizontal: 24, paddingTop: 16, letterSpacing: -0.5 },
  countRow: { paddingHorizontal: 24, marginTop: 12 },
  countCard: { backgroundColor: c.successSoft, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: `${c.success}30` },
  countVal: { fontSize: 32, fontWeight: '800', color: c.success },
  countLabel: { fontSize: 12, color: c.textSec, fontWeight: '600', marginTop: 2 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  card: { backgroundColor: 'transparent', borderRadius: 20, borderWidth: 1, borderColor: c.cardBorder, padding: 18, marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.successSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  codeText: { fontSize: 12, fontWeight: '800', color: c.success, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { fontSize: 11, fontWeight: '700', color: c.success },
  material: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 8 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  size: { fontSize: 14, color: c.textSec },
});
