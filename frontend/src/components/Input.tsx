import React, { useState, memo, useRef } from 'react';
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
import { useTheme } from '../utils/theme';
import { typography, spacing, radius } from '../theme/theme';

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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    onFocus?.(e);
  };
  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? c.danger : c.inputBorder,
      error ? c.danger : c.primary,
    ],
  });

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: isFocused ? c.primary : c.textSec }]}>
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputWrap,
          {
            backgroundColor: c.inputBg,
            borderColor,
            borderWidth: isFocused ? 1.5 : 1,
          },
        ]}
      >
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
            accessibilityLabel={passwordVisible ? 'Parolni yashirish' : 'Parolni ko\'rish'}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {passwordVisible
              ? <EyeOff color={c.textSec} size={20} />
              : <Eye    color={c.textSec} size={20} />
            }
          </TouchableOpacity>
        )}
      </Animated.View>

      {error && (
        <Text style={[styles.error, { color: c.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {!error && hint && (
        <Text style={[styles.hint, { color: c.textTer }]}>{hint}</Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  leftIconWrap: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body1,
    minHeight: 56,
    paddingVertical: 0,
  },
  inputWithLeft: {
    paddingLeft: 0,
  },
  eyeBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
