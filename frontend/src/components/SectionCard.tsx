import { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../utils/theme';
import { radius, shadows, spacing, typography } from '../theme/theme';

type SectionCardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  style?: ViewStyle;
}>;

export function SectionCard({ title, subtitle, right, style, children }: SectionCardProps) {
  const c = useTheme();

  return (
    <View style={[styles.card, shadows.md, { backgroundColor: c.card, borderColor: c.cardBorder }, style]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.body2,
    marginTop: spacing.xxs,
  },
});
