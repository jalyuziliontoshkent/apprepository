import React, { memo, useCallback, useRef } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../utils/theme';
import { useAppStore } from '../utils/store';

interface ButtonProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const HEIGHT: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 46,
  md: 56,
  lg: 64,
};

export const Button = memo<ButtonProps>(({
  title,
  loading = false,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  leftIcon,
  rightIcon,
  onPress,
  accessibilityLabel,
}) => {
  const c = useTheme();
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === 'dark';
  const isDisabled = loading || !!disabled;
  const h = HEIGHT[size];

  // Spring press animation
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.94,
        useNativeDriver: true,
        speed: 40,
        bounciness: 8,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scale, glow]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 12,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scale, glow]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  if (variant === 'primary') {
    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      >
        <Animated.View
          style={[
            styles.base,
            {
              height: h,
              borderRadius: 100,
              transform: [{ scale }],
              opacity: isDisabled ? 0.45 : 1,
              shadowColor: c.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.45,
              shadowRadius: 20,
              elevation: 12,
            },
            style,
          ]}
        >
          {/* Main gradient */}
          <LinearGradient
            colors={[c.secondary, c.primary, '#CC2A20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 100 }]}
          />
          {/* Top shine */}
          <LinearGradient
            colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 100, height: '60%' }]}
            pointerEvents="none"
          />
          {/* Press glow overlay */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 100,
                backgroundColor: '#FFFFFF',
                opacity: glowOpacity,
              },
            ]}
            pointerEvents="none"
          />
          {/* Border ring */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 100,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.22)',
              },
            ]}
            pointerEvents="none"
          />
          <View style={[styles.inner, { height: h }]}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                <Text style={[styles.text, styles.textWhite, { fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16 }]}>
                  {title}
                </Text>
                {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
              </>
            )}
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      >
        <Animated.View
          style={[
            styles.base,
            {
              height: h,
              borderRadius: 100,
              transform: [{ scale }],
              opacity: isDisabled ? 0.45 : 1,
              backgroundColor: isDark ? 'rgba(255,82,82,0.18)' : 'rgba(198,40,40,0.08)',
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(255,82,82,0.35)' : 'rgba(198,40,40,0.25)',
            },
            style,
          ]}
        >
          <View style={[styles.inner, { height: h }]}>
            {loading ? (
              <ActivityIndicator color={c.danger} size="small" />
            ) : (
              <>
                {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                <Text style={[styles.text, { color: c.danger }]}>{title}</Text>
                {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
              </>
            )}
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      >
        <Animated.View
          style={[
            styles.base,
            {
              height: h,
              borderRadius: 100,
              transform: [{ scale }],
              opacity: isDisabled ? 0.45 : 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)',
            },
            style,
          ]}
        >
          <View style={[styles.inner, { height: h }]}>
            {loading ? (
              <ActivityIndicator color={c.text} size="small" />
            ) : (
              <>
                {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                <Text style={[styles.text, { color: c.text }]}>{title}</Text>
                {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
              </>
            )}
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      >
        <Animated.View
          style={[
            styles.base,
            {
              height: h,
              borderRadius: 100,
              transform: [{ scale }],
              opacity: isDisabled ? 0.45 : 1,
              borderWidth: 1.5,
              borderColor: c.primary,
              backgroundColor: 'transparent',
            },
            style,
          ]}
        >
          <View style={[styles.inner, { height: h }]}>
            {loading ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              <>
                {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                <Text style={[styles.text, { color: c.primary }]}>{title}</Text>
                {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
              </>
            )}
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }

  // ghost
  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
    >
      <Animated.View
        style={[
          styles.base,
          {
            height: h,
            borderRadius: 100,
            transform: [{ scale }],
            opacity: isDisabled ? 0.45 : 1,
          },
          style,
        ]}
      >
        <View style={[styles.inner, { height: h }]}>
          {loading ? (
            <ActivityIndicator color={c.primary} size="small" />
          ) : (
            <>
              {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
              <Text style={[styles.text, { color: c.primary }]}>{title}</Text>
              {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </>
          )}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  iconLeft:  { marginRight: 8 },
  iconRight: { marginLeft: 8  },
});
