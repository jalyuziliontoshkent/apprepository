import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../utils/store';
import { Moon, Sun, DollarSign } from 'lucide-react-native';

export function FloatingSettings() {
  const { theme, toggleTheme, toggleCurrency } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.button}
        onPress={() => void toggleTheme()}
        activeOpacity={0.8}
      >
        {isDark ? (
          <Sun size={20} color="#000000" />
        ) : (
          <Moon size={20} color="#000000" strokeWidth={2.5} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => void toggleCurrency()}
        activeOpacity={0.8}
      >
        <DollarSign size={20} color="#000000" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 80,
    zIndex: 9999,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});
