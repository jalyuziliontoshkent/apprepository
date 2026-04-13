import React, { memo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../utils/theme';
import { typography, spacing, radius, shadows } from '../theme/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const HEIGHT: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 44,
  md: 54,
  lg: 62,
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
  ...props
}) => {
  const c = useTheme();
  const isDisabled = loading || !!disabled;
  const h = HEIGHT[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        style={[
          styles.base,
          { borderRadius: radius.full, height: h },
          shadows.md,
          isDisabled && styles.disabled,
          style,
        ]}
        disabled={isDisabled}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={title}
        {...props}
      >
        <LinearGradient
          colors={[c.primary, c.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.inner, { height: h, borderRadius: radius.full }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
              <Text style={[styles.text, styles.textWhite]}>{title}</Text>
              {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const flatBg =
    variant === 'secondary' ? c.card :
    variant === 'outline'   ? 'transparent' :
    'transparent'; // ghost

  const textColor =
    variant === 'ghost' ? c.primary : c.text;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles.flat,
        {
          borderRadius: radius.full,
          height: h,
          backgroundColor: flatBg,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: variant === 'outline' ? c.primary : 'transparent',
        },
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={title}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={c.primary} size="small" />
      ) : (
        <>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
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
    paddingHorizontal: spacing.lg,
  },
  flat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  text: {
    ...typography.button,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.45,
  },
  iconLeft:  { marginRight: spacing.sm },
  iconRight: { marginLeft: spacing.sm  },
});
