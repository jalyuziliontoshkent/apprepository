import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { LayoutDashboard, Package, Boxes, Users, MessageCircle } from 'lucide-react-native';
import { colors } from '../../src/utils/theme';

const TabIcon = ({ Icon, label, focused }: { Icon: any; label: string; focused: boolean }) => (
  <View style={styles.tabItem}>
    <Icon size={22} color={focused ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth={focused ? 2.5 : 1.5} />
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
  </View>
);

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={LayoutDashboard} label="Bosh sahifa" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Package} label="Buyurtmalar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Boxes} label="Ombor" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dealers"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Users} label="Dilerlar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={MessageCircle} label="Chat" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(5,5,5,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#fff',
  },
});
