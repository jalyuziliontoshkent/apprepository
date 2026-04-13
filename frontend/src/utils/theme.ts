import { darkColors, lightColors, ThemeColors } from '../theme/theme';
import { useThemeContext } from '../theme/ThemeProvider';
import { useAppStore } from './store';

export type { ThemeColors };
export { darkColors, lightColors };

export const useTheme = (): ThemeColors => useThemeContext();

export const useCurrency = () => {
  const currency = useAppStore((s) => s.currency);
  const exchangeRate = useAppStore((s) => s.exchangeRate);
  const toggleCurrency = useAppStore((s) => s.toggleCurrency);

  const formatPrice = (usd: number): string => {
    if (currency === 'UZS') {
      const uzs = Math.round(usd * exchangeRate);
      return `${uzs.toLocaleString('uz-UZ')} so'm`;
    }

    return `$${usd.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return { currency, exchangeRate, toggleCurrency, formatPrice };
};

export const statusLabels: Record<string, string> = {
  kutilmoqda: 'Kutilmoqda',
  tasdiqlangan: 'Tasdiqlangan',
  tayyorlanmoqda: 'Tayyorlanmoqda',
  tayyor: 'Tayyor',
  yetkazilmoqda: 'Yetkazilmoqda',
  yetkazildi: 'Yetkazildi',
  rad_etilgan: 'Rad etilgan',
};

export const getStatusColor = (status: string, c: ThemeColors): string => {
  const map: Record<string, string> = {
    kutilmoqda: c.pending,
    tasdiqlangan: c.approved,
    tayyorlanmoqda: c.preparing,
    tayyor: c.ready,
    yetkazilmoqda: c.blue,
    yetkazildi: c.delivered,
    rad_etilgan: c.danger,
  };

  return map[status] ?? c.textTer;
};

export const formatPrice = (value: number): string =>
  `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
