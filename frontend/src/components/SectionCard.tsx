import { PropsWithChildren, ReactNode, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ViewStyle, Animated, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../utils/theme';
import { useAppStore } from '../utils/store';

type SectionCardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  style?: ViewStyle;
  pressable?: boolean;
  onPress?: () => void;
}>;

export function SectionCard({ title, subtitle, right, style, children, pressable, onPress }: SectionCardProps) {
  const c = useTheme();
  const theme = useAppStore((state) => state.theme);
  const isDark = theme === 'dark';

  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (!pressable) return;
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
    }).start();
  }, [pressable, scale]);

  const handlePressOut = useCallback(() => {
    if (!pressable) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 14,
    }).start();
  }, [pressable, scale]);

  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale }],
          shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.15)',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.28 : 0.1,
          shadowRadius: 20,
          elevation: 8,
        },
        style,
      ]}
    >
      <BlurView
        intensity={isDark ? 40 : 80}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blur,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.55)',
          },
        ]}
      >
        {/* Main glass gradient */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.03)']
              : ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.35)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Top shine line */}
        <LinearGradient
          colors={[
            isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,1)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.shineGrad]}
          pointerEvents="none"
        />

        {(title || subtitle || right) ? (
          <View style={styles.header}>
            <View style={styles.headerText}>
              {title ? <Text style={[styles.title, { color: c.text }]}>{title}</Text> : null}
              {subtitle ? <Text style={[styles.subtitle, { color: c.textSec }]}>{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        ) : null}
        {children}
      </BlurView>
    </Animated.View>
  );

  if (pressable && onPress) {
    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </TouchableWithoutFeedback>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  blur: {
    padding: 22,
    borderWidth: 1,
    borderRadius: 28,
  },
  shineGrad: {
    height: '50%',
    borderRadius: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    marginTop: 2,
  },
});
