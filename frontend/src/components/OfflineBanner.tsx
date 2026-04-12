import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable;
      const offlineNow = !connected || reachable === false;
      setOffline(offlineNow);
    });
    NetInfo.fetch().then((state) => {
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable;
      setOffline(!connected || reachable === false);
    });
    return () => unsub();
  }, []);

  if (!offline) return null;

  return (
    <View style={[styles.wrap, { top: insets.top }]} pointerEvents="none">
      <Text style={styles.text}>Internet yo‘q — oxirgi saqlangan ma’lumotlar ko‘rsatiladi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(180, 120, 0, 0.92)',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: {
    color: '#111',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
