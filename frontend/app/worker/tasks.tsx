import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, LogOut, Ruler, Moon, Sun, DollarSign, Wallet } from 'lucide-react-native';
import { api } from '../../src/services/apiClient';
import { SectionCard } from '../../src/components/SectionCard';
import { StateView } from '../../src/components/StateView';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useAppStore } from '../../src/utils/store';
import { useCurrency, useTheme } from '../../src/utils/theme';

export default function WorkerTasks() {
  const c = useTheme();
  const s = useMemo(() => createStyles(c), [c]);
  const userName = useAuthStore((state) => state.user?.name) || 'Ishchi';
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const toggleCurrency = useAppStore((state) => state.toggleCurrency);
  const { currency } = useCurrency();
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      setError('');
      const data = await api('/worker/tasks', { cacheKey: 'worker-tasks-active', cacheTtlMs: 12000 });
      const safeTasks = Array.isArray(data) ? data : [];
      setTasks(safeTasks.filter((item: any) => item.worker_status !== 'completed'));
    } catch (err: any) {
      setError(err?.message || 'Vazifalar yuklanmadi');
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const completeTask = async (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    if (completingIds.has(key)) return;

    setCompletingIds((prev) => new Set(prev).add(key));
    try {
      await api(`/worker/tasks/${orderId}/${itemIdx}/complete`, { method: 'PUT' });
      Alert.alert('Bajarildi', 'Vazifa muvaffaqiyatli tugallandi');
      fetchTasks();
    } catch (err: any) {
      Alert.alert('Xatolik', err?.message || 'Vazifa saqlanmadi');
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <StateView title="Vazifalar tayyorlanmoqda" message="Bugungi topshiriqlar yuklanmoqda." loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.backgroundAccent} pointerEvents="none">
        <LinearGradient colors={['rgba(255,69,58,0.16)', 'transparent']} style={s.backgroundGlowPrimary} />
        <LinearGradient colors={['rgba(77,163,255,0.12)', 'transparent']} style={s.backgroundGlowSecondary} />
      </View>

      <View style={s.header}>
        <View style={s.headerTextWrap}>
          <Text style={s.eyebrow}>Bugungi ish</Text>
          <Text style={s.title}>{userName}</Text>
          <Text style={s.subtitle}>Topshiriqlarni ortiqcha shovqinsiz, aniq va tez bajarish uchun soddalashtirilgan panel.</Text>
        </View>
        <View style={s.headerControls}>
          <TouchableOpacity style={s.iconButton} onPress={() => void toggleTheme()}>
            {theme === 'dark' ? <Sun size={20} color={c.text} /> : <Moon size={20} color={c.text} />}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconButton} onPress={() => void toggleCurrency()}>
            {currency === 'USD' ? <DollarSign size={20} color={c.success} /> : <Wallet size={20} color={c.primary} />}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconButton} onPress={handleLogout}>
            <LogOut size={20} color={c.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor={c.text} />}
      >


        <SectionCard style={s.hero}>
          <Text style={s.heroLabel}>Faol vazifalar</Text>
          <Text style={s.heroValue}>{tasks.length}</Text>
          <Text style={s.heroMeta}>Biriktirilgan topshiriqlarni shu yerdan tez yakunlaysiz.</Text>
        </SectionCard>

        {error ? (
          <StateView title="Yuklashda xatolik" message={error} actionLabel="Qayta urinish" onAction={fetchTasks} />
        ) : tasks.length === 0 ? (
          <StateView title="Hozircha vazifa yo`q" message="Yangi topshiriq berilganda shu yerda ko`rinadi." />
        ) : (
          <SectionCard title="Faol topshiriqlar" subtitle="Faqat bajarilishi kerak bo`lgan vazifalar">
            {tasks.map((task) => {
              const taskKey = `${task.order_id}-${task.item_index}`;
              const isCompleting = completingIds.has(taskKey);

              return (
                <View key={taskKey} style={s.taskCard}>
                  <View style={s.taskTop}>
                    <Text style={s.taskCode}>{task.order_code}</Text>
                    <Text style={s.taskDealer}>{task.dealer_name}</Text>
                  </View>
                  <Text style={s.taskMaterial}>{task.material_name}</Text>
                  <View style={s.taskInfo}>
                    <Ruler size={14} color={c.textSec} />
                    <Text style={s.taskInfoText}>{task.width}m x {task.height}m = {task.sqm} kv.m</Text>
                  </View>
                  {task.notes ? <Text style={s.taskNotes}>{task.notes}</Text> : null}
                  <TouchableOpacity style={[s.doneButton, isCompleting && s.doneButtonDisabled]} onPress={() => completeTask(task.order_id, task.item_index)} disabled={isCompleting}>
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text style={s.doneButtonText}>{isCompleting ? 'Saqlanmoqda...' : 'Bajarildi'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </SectionCard>
        )}

        <View style={s.bottomGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  backgroundAccent: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  backgroundGlowPrimary: {
    position: 'absolute',
    top: -120,
    left: -90,
    width: 320,
    height: 320,
    borderRadius: 320,
  },
  backgroundGlowSecondary: {
    position: 'absolute',
    right: -110,
    top: 120,
    width: 260,
    height: 260,
    borderRadius: 260,
  },
  centered: { flex: 1, paddingHorizontal: 22, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 16,
  },
  headerTextWrap: { flex: 1 },
  headerControls: { flexDirection: 'row', gap: 8 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: { fontSize: 32, fontWeight: '900', color: c.text, marginTop: 4 },
  subtitle: { fontSize: 14, color: c.textSec, marginTop: 8, lineHeight: 21, maxWidth: 320 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 108, gap: 14 },
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
  taskDealer: { fontSize: 12, color: c.textSec },
  taskMaterial: { fontSize: 18, fontWeight: '800', color: c.text, marginTop: 12 },
  taskInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  taskInfoText: { fontSize: 14, color: c.textSec },
  taskNotes: { fontSize: 13, color: c.textTer, marginTop: 10 },
  doneButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  doneButtonDisabled: { opacity: 0.65 },
  doneButtonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  bottomGap: { height: 10 },
});
