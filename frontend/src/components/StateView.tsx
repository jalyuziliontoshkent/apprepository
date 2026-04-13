import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { useTheme } from '../utils/theme';
import { Button } from './Button';
import { radius, spacing, typography } from '../theme/theme';

type StateViewProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  loading?: boolean;
};

export function StateView({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  loading = false,
}: StateViewProps) {
  const c = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.accentSoft }]}>
        {loading ? <ActivityIndicator color={c.accent} size="small" /> : icon ?? <Package size={24} color={c.accent} />}
      </View>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: c.textSec }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
  },
  message: {
    ...typography.body1,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
    width: '100%',
  },
});
