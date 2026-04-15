import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Home, MessageCircle, Package, ShoppingBag } from 'lucide-react-native';
import { useTheme } from '../../src/utils/theme';

const icons = {
  dashboard: Home,
  'new-order': ShoppingBag,
  orders: Package,
  chat: MessageCircle,
};

function renderIcon(name: keyof typeof icons, color: string) {
  const Icon = icons[name];
  return <Icon size={20} color={color} strokeWidth={2.2} />;
}

export default function DealerLayout() {
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
      <Tabs.Screen name="new-order" options={{ title: 'Buyurtma' }} />
      <Tabs.Screen name="orders" options={{ title: 'Ro`yxat' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    height: 74,
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
