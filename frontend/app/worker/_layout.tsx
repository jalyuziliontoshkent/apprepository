import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { CheckCircle2, ClipboardList } from 'lucide-react-native';
import { useTheme } from '../../src/utils/theme';

const icons = {
  tasks: ClipboardList,
  completed: CheckCircle2,
};

function renderIcon(name: keyof typeof icons, color: string) {
  const Icon = icons[name];
  return <Icon size={20} color={color} strokeWidth={2.2} />;
}

export default function WorkerLayout() {
  const c = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [styles.tabBar, { borderColor: c.tabBorder }],
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: c.textSec,
        tabBarActiveBackgroundColor: c.accent,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          <BlurView
            intensity={40}
            tint={c.statusBar === 'light' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarIcon: ({ color }) => renderIcon(route.name as keyof typeof icons, color),
      })}
    >
      <Tabs.Screen name="tasks" options={{ title: 'Vazifa' }} />
      <Tabs.Screen name="completed" options={{ title: 'Tugagan' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 14,
    height: 72,
    borderTopWidth: 1,
    borderRadius: 28,
    paddingTop: 9,
    paddingBottom: 9,
    paddingHorizontal: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  tabItem: {
    borderRadius: 22,
    marginHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
