import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
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
  const Icon = icons[name] ?? LayoutDashboard;
  return <Icon size={20} color={color} strokeWidth={2.2} />;
}

export default function AdminLayout() {
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
