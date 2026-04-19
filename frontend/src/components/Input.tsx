import React, { useState, memo, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  Animated,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../utils/theme';
import { useAppStore } from '../utils/store';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = memo<InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}) => {
  const c = useTheme();
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const borderAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = useCallback((e: any) => {
    setIsFocused(true);
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1.015, useNativeDriver: true, speed: 30, bounciness: 5 }),
    ]).start();
    onFocus?.(e);
  }, [borderAnim, scaleAnim, onFocus]);

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 0, duration: 220, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 5 }),
    ]).start();
    onBlur?.(e);
  }, [borderAnim, scaleAnim, onBlur]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? c.danger : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'),
      error ? c.danger : c.primary,
    ],
  });

  const shadowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDark ? 0.3 : 0.15],
  });

  return (
    <View style={styles.container}>
      {label && (
        <Animated.Text style={[styles.label, { color: isFocused ? c.primary : c.textSec }]}>
          {label}
        </Animated.Text>
      )}

      <Animated.View
        style={[
          styles.inputWrap,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)',
            borderColor,
            borderWidth: isFocused ? 1.5 : 1,
            transform: [{ scale: scaleAnim }],
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity,
            shadowRadius: 12,
            elevation: isFocused ? 4 : 0,
          },
        ]}
      >
        {/* Top shine */}
        <LinearGradient
          colors={[
            isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.9)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 18, height: '55%' }]}
          pointerEvents="none"
        />

        {leftIcon && (
          <View style={styles.leftIconWrap}>{leftIcon}</View>
        )}

        <TextInput
          style={[
            styles.input,
            { color: c.text },
            leftIcon ? styles.inputWithLeft : undefined,
          ]}
          placeholderTextColor={c.placeholder}
          secureTextEntry={secureTextEntry && !passwordVisible}
          selectionColor={c.primary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setPasswordVisible((v) => !v)}
            style={styles.eyeBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {passwordVisible
              ? <EyeOff color={c.textSec} size={20} />
              : <Eye    color={c.textSec} size={20} />
            }
          </TouchableOpacity>
        )}
      </Animated.View>

      {error ? (
        <Text style={[styles.error, { color: c.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: c.textTer }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  leftIconWrap: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    minHeight: 58,
    paddingVertical: 0,
  },
  inputWithLeft: {
    paddingLeft: 0,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 6,
  },
});
