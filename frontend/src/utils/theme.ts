import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#050505',
  surface: '#0a0a0a',
  glassBg: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.1)',
  glassActive: 'rgba(255,255,255,0.12)',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.3)',
  black: '#000000',
  success: '#00C853',
  warning: '#FFB300',
  danger: '#FF5252',
  pending: '#FFB300',
  approved: '#00C853',
  preparing: '#448AFF',
  delivered: '#00E676',
  rejected: '#FF5252',
};

export const statusColors: Record<string, string> = {
  kutilmoqda: colors.pending,
  tasdiqlangan: colors.approved,
  tayyorlanmoqda: colors.preparing,
  yetkazildi: colors.delivered,
  rad_etilgan: colors.rejected,
};

export const statusLabels: Record<string, string> = {
  kutilmoqda: 'Kutilmoqda',
  tasdiqlangan: 'Tasdiqlangan',
  tayyorlanmoqda: 'Tayyorlanmoqda',
  yetkazildi: 'Yetkazildi',
  rad_etilgan: 'Rad etilgan',
};

export const glassCard = StyleSheet.create({
  container: {
    backgroundColor: colors.glassBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  inner: {
    padding: 20,
  },
});

export const formatPrice = (price: number) => {
  return price.toLocaleString('uz-UZ') + " so'm";
};
