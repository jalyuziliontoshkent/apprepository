// Core design system — single source of truth for all UI tokens

// ─── Color Palettes ─────────────────────────────────────────────────────────

export const palette = {
  // Brand
  indigo: {
    50:  '#EEEEFF',
    100: '#DDDEFF',
    200: '#B9BAFF',
    300: '#9596FF',
    400: '#7172FF',
    500: '#6C63FF',  // primary
    600: '#5A52E0',
    700: '#4741C2',
    800: '#3530A3',
    900: '#241F85',
  },
  // Surface neutrals – dark
  darkBg:      '#07070C',
  darkSurface: '#111118',
  darkCard:    'rgba(255,255,255,0.04)',
  darkBorder:  'rgba(255,255,255,0.08)',
  // Surface neutrals – light
  lightBg:      '#F4F4F8',
  lightSurface: '#FFFFFF',
  lightCard:    'rgba(0,0,0,0.03)',
  lightBorder:  'rgba(0,0,0,0.09)',
  // Semantic
  success: '#00E676',
  warning: '#FFB300',
  danger:  '#FF5252',
  info:    '#448AFF',
  // Text
  white: '#FFFFFF',
  black: '#0A0A0A',
} as const;

// ─── Theme Tokens ────────────────────────────────────────────────────────────

export interface ThemeColors {
  // Backgrounds
  bg: string;
  surface: string;
  card: string;
  // Borders
  border: string;
  cardBorder: string;
  // Text
  text: string;
  textSec: string;
  textTer: string;
  // Brand
  primary: string;
  primarySoft: string;
  secondary: string;
  // Status
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  blue: string;
  blueSoft: string;
  // Input
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  // Modal / Tab
  modalBg: string;
  tabBg: string;
  tabBorder: string;
  // Order statuses
  pending: string;
  approved: string;
  preparing: string;
  ready: string;
  delivered: string;
  rejected: string;
  // Status bar
  statusBar: 'light' | 'dark';
  // Aliases (kept for backward compat)
  accent: string;
  accentSoft: string;
}

export const darkColors: ThemeColors = {
  bg:           '#07070C',
  surface:      '#111118',
  card:         'rgba(255,255,255,0.04)',
  border:       'rgba(255,255,255,0.08)',
  cardBorder:   'rgba(255,255,255,0.08)',
  text:         '#F8F8FF',
  textSec:      'rgba(248,248,255,0.50)',
  textTer:      'rgba(248,248,255,0.28)',
  primary:      palette.indigo[500],
  primarySoft:  'rgba(108,99,255,0.15)',
  secondary:    palette.indigo[600],
  success:      '#00E676',
  successSoft:  'rgba(0,230,118,0.12)',
  warning:      '#FFB300',
  warningSoft:  'rgba(255,179,0,0.12)',
  danger:       '#FF5252',
  dangerSoft:   'rgba(255,82,82,0.10)',
  blue:         '#448AFF',
  blueSoft:     'rgba(68,138,255,0.12)',
  inputBg:      'rgba(255,255,255,0.06)',
  inputBorder:  'rgba(255,255,255,0.10)',
  placeholder:  'rgba(248,248,255,0.28)',
  modalBg:      '#0E0E15',
  tabBg:        'rgba(7,7,12,0.97)',
  tabBorder:    'rgba(255,255,255,0.06)',
  pending:      '#FFB300',
  approved:     palette.indigo[500],
  preparing:    '#448AFF',
  ready:        '#00E676',
  delivered:    '#00C853',
  rejected:     '#FF5252',
  statusBar:    'light',
  // aliases
  accent:       palette.indigo[500],
  accentSoft:   'rgba(108,99,255,0.15)',
};

export const lightColors: ThemeColors = {
  bg:           '#F4F4F8',
  surface:      '#FFFFFF',
  card:         'rgba(0,0,0,0.03)',
  border:       'rgba(0,0,0,0.09)',
  cardBorder:   'rgba(0,0,0,0.09)',
  text:         '#0A0A12',
  textSec:      'rgba(10,10,18,0.52)',
  textTer:      'rgba(10,10,18,0.32)',
  primary:      palette.indigo[600],
  primarySoft:  'rgba(90,82,224,0.10)',
  secondary:    palette.indigo[700],
  success:      '#00A847',
  successSoft:  'rgba(0,168,71,0.10)',
  warning:      '#E65100',
  warningSoft:  'rgba(230,81,0,0.10)',
  danger:       '#C62828',
  dangerSoft:   'rgba(198,40,40,0.08)',
  blue:         '#1565C0',
  blueSoft:     'rgba(21,101,192,0.08)',
  inputBg:      'rgba(0,0,0,0.04)',
  inputBorder:  'rgba(0,0,0,0.12)',
  placeholder:  'rgba(10,10,18,0.35)',
  modalBg:      '#FFFFFF',
  tabBg:        'rgba(255,255,255,0.97)',
  tabBorder:    'rgba(0,0,0,0.08)',
  pending:      '#E65100',
  approved:     palette.indigo[600],
  preparing:    '#1565C0',
  ready:        '#00A847',
  delivered:    '#00A847',
  rejected:     '#C62828',
  statusBar:    'dark',
  // aliases
  accent:       palette.indigo[600],
  accentSoft:   'rgba(90,82,224,0.10)',
};

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  // Display
  display1: { fontSize: 40, fontWeight: '800' as const, lineHeight: 48, letterSpacing: -1.5 },
  display2: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -1 },
  // Headings
  h1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 36, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 26 },
  h4: { fontSize: 16, fontWeight: '700' as const, lineHeight: 24 },
  // Body — minimum 16px per accessibility requirement
  body1: { fontSize: 16, fontWeight: '400' as const, lineHeight: 26 },
  body2: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24 },
  // UI
  button: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.2 },
  label:  { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  caption:{ fontSize: 12, fontWeight: '500' as const, lineHeight: 18 },
  badge:  { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
} as const;

// ─── Spacing Scale ───────────────────────────────────────────────────────────

export const spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   24,
  xxl:  32,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

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
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// ─── Legacy alias (backward compat) ──────────────────────────────────────────

export const colors = {
  dark:  darkColors,
  light: lightColors,
};
