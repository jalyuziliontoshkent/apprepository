import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Boxes, LayoutDashboard, MessageCircle, Package, Users, Wrench } from 'lucide-react-native';
import { useTheme } from '../../src/utils/theme';

const icons = {
  dashboard: LayoutDashboard,
  orders: Package,
  inventory: Boxes,
  dealers: Users,
  workers: Wrench,
  chat: MessageCircle,
};

function renderIcon(name: keyof typeof icons, color: string) {
  const Icon = icons[name];
  return <Icon size={20} color={color} strokeWidth={2.2} />;
}

export default function AdminLayout() {
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
      <Tabs.Screen name="dashboard" options={{ title: 'Bosh' }} />
      <Tabs.Screen name="orders" options={{ title: 'Buyurtma' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Ombor' }} />
      <Tabs.Screen name="dealers" options={{ title: 'Diler' }} />
      <Tabs.Screen name="workers" options={{ title: 'Ishchi' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    height: 78,
    borderTopWidth: 1,
    borderRadius: 30,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  tabItem: {
    borderRadius: 22,
    marginHorizontal: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
