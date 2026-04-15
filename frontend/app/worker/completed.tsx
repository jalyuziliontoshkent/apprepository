import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Ruler } from 'lucide-react-native';
import { api } from '../../src/services/apiClient';
import { SectionCard } from '../../src/components/SectionCard';
import { StateView } from '../../src/components/StateView';
import { useTheme } from '../../src/utils/theme';

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
      const data = await api('/worker/tasks', { cacheKey: 'worker-tasks-completed', cacheTtlMs: 12000 });
      setTasks(data.filter((item: any) => item.worker_status === 'completed'));
    } catch (err: any) {
      setError(err?.message || 'Bajarilgan ishlar yuklanmadi');
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
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <StateView title="Tarix tayyorlanmoqda" message="Bajarilgan vazifalar yuklanmoqda." loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor={c.text} />}
      >
        <SectionCard style={s.hero}>
          <Text style={s.heroLabel}>Yakunlangan ishlar</Text>
          <Text style={s.heroValue}>{tasks.length}</Text>
          <Text style={s.heroMeta}>Bugungacha tugallangan topshiriqlar ro`yxati.</Text>
        </SectionCard>

        {error ? (
          <StateView title="Yuklashda xatolik" message={error} actionLabel="Qayta urinish" onAction={fetchTasks} />
        ) : tasks.length === 0 ? (
          <StateView title="Tarix bo`sh" message="Birinchi vazifa tugagach, shu yerda ko`rinadi." />
        ) : (
          <SectionCard title="Bajarilgan topshiriqlar" subtitle="Yaqin tarix">
            {tasks.map((task) => (
              <View key={`${task.order_id}-${task.item_index}`} style={s.taskCard}>
                <View style={s.taskTop}>
                  <Text style={s.taskCode}>{task.order_code}</Text>
                  <View style={s.doneBadge}>
                    <CheckCircle size={14} color={c.success} />
                    <Text style={s.doneText}>Bajarildi</Text>
                  </View>
                </View>
                <Text style={s.taskMaterial}>{task.material_name}</Text>
                <View style={s.taskInfo}>
                  <Ruler size={14} color={c.textSec} />
                  <Text style={s.taskInfoText}>{task.width}m x {task.height}m = {task.sqm} kv.m</Text>
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        <View style={s.bottomGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  centered: { flex: 1, paddingHorizontal: 22, justifyContent: 'center' },
  scroll: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 108, gap: 14 },
  hero: { padding: 22 },
  heroLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: { fontSize: 40, fontWeight: '900', color: c.text, marginTop: 10 },
  heroMeta: { fontSize: 14, color: c.textSec, marginTop: 8 },
  taskCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.inputBg,
    padding: 16,
    marginBottom: 12,
  },
  taskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  taskCode: { fontSize: 13, fontWeight: '900', color: c.text, letterSpacing: 1 },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneText: { fontSize: 12, fontWeight: '800', color: c.success },
  taskMaterial: { fontSize: 18, fontWeight: '800', color: c.text, marginTop: 12 },
  taskInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  taskInfoText: { fontSize: 14, color: c.textSec },
  bottomGap: { height: 10 },
});
