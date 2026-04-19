import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { CheckCircle2, ClipboardList } from 'lucide-react-native';
import { useTheme } from '../../src/utils/theme';

const icons = {
  tasks: ClipboardList,
  completed: CheckCircle2,
};

function renderIcon(name: keyof typeof icons, color: string) {
  const Icon = icons[name] ?? ClipboardList;
  return <Icon size={20} color={color} strokeWidth={2.2} />;
}

export default function WorkerLayout() {
  const c = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [styles.tabBar, { borderTopColor: c.tabBorder }],
        sceneStyle: { backgroundColor: c.bg },
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textSec,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          Platform.OS === 'web' ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.webTabBackground,
                { backgroundColor: c.tabBg, borderTopColor: c.tabBorder },
              ]}
            />
          ) : (
            <BlurView
              intensity={55}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          )
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
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    borderTopWidth: 1,
    borderRadius: 0,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 6,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  tabItem: {
    borderRadius: 18,
    marginHorizontal: 2,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 0,
  },
  webTabBackground: {
    borderTopWidth: 1,
  },
});
