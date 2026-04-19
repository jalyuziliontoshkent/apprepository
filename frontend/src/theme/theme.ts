// Core design system - single source of truth for all UI tokens

export const palette = {
  red: {
    50: '#FFF1EF',
    100: '#FFD8D2',
    200: '#FFB1A7',
    300: '#FF8A7B',
    400: '#FF6957',
    500: '#FF453A',
    600: '#E33B31',
    700: '#B92F28',
    800: '#91241F',
    900: '#661714',
  },
  graphite: '#1F1F22',
  obsidian: '#141416',
  pearl: '#F5F5F7',
  fog: '#E8E8EC',
  success: '#00E676',
  warning: '#FFB300',
  danger: '#FF5252',
  info: '#448AFF',
  white: '#FFFFFF',
  black: '#0A0A0A',
} as const;

export interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  border: string;
  cardBorder: string;
  text: string;
  textSec: string;
  textTer: string;
  primary: string;
  primarySoft: string;
  secondary: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  blue: string;
  blueSoft: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  modalBg: string;
  tabBg: string;
  tabBorder: string;
  pending: string;
  approved: string;
  preparing: string;
  ready: string;
  delivered: string;
  rejected: string;
  statusBar: 'light' | 'dark';
  accent: string;
  accentSoft: string;
}

export const darkColors: ThemeColors = {
  bg: '#050608',
  surface: '#0D0F15',
  card: '#10131B',
  border: 'rgba(123,108,255,0.12)',
  cardBorder: 'rgba(255,255,255,0.08)',
  text: '#F6F7FF',
  textSec: '#949AB7',
  textTer: '#5E6583',
  primary: '#6C63FF',
  primarySoft: 'rgba(108,99,255,0.18)',
  secondary: '#8B7DFF',
  success: '#22C67A',
  successSoft: 'rgba(34,198,122,0.14)',
  warning: '#F3BE4E',
  warningSoft: 'rgba(243,190,78,0.14)',
  danger: '#FF5D62',
  dangerSoft: 'rgba(255,93,98,0.14)',
  blue: '#59A2FF',
  blueSoft: 'rgba(89,162,255,0.14)',
  inputBg: '#141721',
  inputBorder: 'rgba(255,255,255,0.08)',
  placeholder: 'rgba(148,154,183,0.52)',
  modalBg: '#0C0E14',
  tabBg: '#050608',
  tabBorder: 'rgba(255,255,255,0.06)',
  pending: '#F3BE4E',
  approved: '#7C6CFF',
  preparing: '#59A2FF',
  ready: '#2DDD86',
  delivered: '#22C67A',
  rejected: '#FF5D62',
  statusBar: 'light',
  accent: '#6C63FF',
  accentSoft: 'rgba(108,99,255,0.18)',
};

export const lightColors: ThemeColors = {
  bg: '#F2F2F4',
  surface: '#FFFFFF',
  card: 'rgba(255,255,255,0.62)',
  border: 'rgba(255,255,255,0.55)',
  cardBorder: 'rgba(17,18,20,0.08)',
  text: '#0A0A12',
  textSec: 'rgba(10,10,18,0.52)',
  textTer: 'rgba(10,10,18,0.32)',
  primary: '#5B50E6',
  primarySoft: 'rgba(91,80,230,0.10)',
  secondary: '#7C6CFF',
  success: '#00A847',
  successSoft: 'rgba(0,168,71,0.10)',
  warning: '#E65100',
  warningSoft: 'rgba(230,81,0,0.10)',
  danger: '#C62828',
  dangerSoft: 'rgba(198,40,40,0.08)',
  blue: '#1565C0',
  blueSoft: 'rgba(21,101,192,0.08)',
  inputBg: 'rgba(255,255,255,0.72)',
  inputBorder: 'rgba(17,18,20,0.10)',
  placeholder: 'rgba(10,10,18,0.35)',
  modalBg: '#FFFFFF',
  tabBg: 'rgba(255,255,255,0.72)',
  tabBorder: 'rgba(17,18,20,0.08)',
  pending: '#E65100',
  approved: '#5B50E6',
  preparing: '#1565C0',
  ready: '#00A847',
  delivered: '#00A847',
  rejected: '#C62828',
  statusBar: 'dark',
  accent: '#5B50E6',
  accentSoft: 'rgba(91,80,230,0.10)',
};

export const typography = {
  display1: { fontSize: 40, fontWeight: '800' as const, lineHeight: 48, letterSpacing: -1.5 },
  display2: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 36, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 26 },
  h4: { fontSize: 16, fontWeight: '700' as const, lineHeight: 24 },
  body1: { fontSize: 16, fontWeight: '400' as const, lineHeight: 26 },
  body2: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24 },
  button: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.2 },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 18 },
  badge: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
} as const;

export const colors = {
  dark: darkColors,
  light: lightColors,
};
