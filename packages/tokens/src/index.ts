/**
 * Tawreed design tokens — single source of truth for web (CSS variables in theme.css)
 * and React Native (imported directly). Brand values come from the brand board:
 * navy #0B2D5B · green #0A9B69 · mint #3CC390 · surface #F4F6F8.
 */

export const palette = {
  green: {
    50: '#E9F8F2',
    100: '#CBEFE0',
    200: '#99DFC4',
    300: '#62CEA6',
    400: '#3CC390', // brand mint
    500: '#17AE7C',
    600: '#0A9B69', // brand green
    700: '#067A5B', // primary action (matches mockups)
    800: '#07614A',
    900: '#074D3D',
    950: '#032B25', // buyer sidebar
  },
  navy: {
    50: '#EEF3FA',
    100: '#D9E4F3',
    200: '#B4C9E7',
    300: '#86A7D6',
    400: '#5781C0',
    500: '#3664A8',
    600: '#254E8D',
    700: '#1B3F74',
    800: '#133462',
    900: '#0B2D5B', // brand navy
    950: '#051A38',
  },
  gray: {
    0: '#FFFFFF',
    50: '#F4F6F8', // brand surface
    100: '#EBEEF2',
    200: '#DDE2E8',
    300: '#C5CDD6',
    400: '#98A3B1',
    500: '#6B7787',
    600: '#515C6B',
    700: '#3D4653',
    800: '#29313B',
    900: '#1A2029',
    950: '#0E1218',
  },
  amber: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
  red: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
  blue: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
} as const;

export const brand = {
  navy: palette.navy[900],
  green: palette.green[600],
  mint: palette.green[400],
  surface: palette.gray[50],
} as const;

/** Semantic colors shared by every surface (light theme). */
export const semantic = {
  background: palette.gray[50],
  surface: palette.gray[0],
  surfaceMuted: palette.gray[100],
  border: palette.gray[200],
  borderStrong: palette.gray[300],
  text: palette.navy[950],
  textMuted: palette.gray[500],
  textSubtle: palette.gray[400],
  textInverse: palette.gray[0],
  primary: palette.green[700],
  primaryHover: palette.green[800],
  primarySoft: palette.green[50],
  primaryText: palette.gray[0],
  secondary: palette.navy[900],
  secondarySoft: palette.navy[50],
  accent: palette.green[400],
  success: palette.green[600],
  successSoft: palette.green[50],
  warning: palette.amber[600],
  warningSoft: palette.amber[100],
  danger: palette.red[600],
  dangerSoft: palette.red[100],
  info: palette.blue[600],
  infoSoft: palette.blue[100],
  focusRing: palette.green[400],
} as const;

/** Chrome (sidebars/headers) per portal so each audience recognizes its space. */
export const portalChrome = {
  buyer: { background: palette.green[950], foreground: palette.gray[0], active: palette.green[700] },
  supplier: { background: palette.navy[900], foreground: palette.gray[0], active: palette.navy[700] },
  admin: { background: palette.navy[950], foreground: palette.gray[0], active: palette.green[700] },
  driver: { background: palette.gray[0], foreground: palette.navy[900], active: palette.green[700] },
} as const;

export const typography = {
  fontFamily: {
    sans: 'Cairo',
    latinDisplay: 'Montserrat',
  },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900' },
  size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60 },
  lineHeight: { tight: 1.25, snug: 1.4, normal: 1.6 },
} as const;

export const radii = { xs: 6, sm: 8, md: 10, lg: 12, xl: 16, '2xl': 20, '3xl': 28, full: 9999 } as const;

export const spacing = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48, 14: 56, 16: 64, 20: 80, 24: 96,
} as const;

/** Soft, navy-tinted shadows (web CSS strings). */
export const shadows = {
  xs: '0 1px 2px rgba(11, 45, 91, 0.05)',
  sm: '0 1px 3px rgba(11, 45, 91, 0.08), 0 1px 2px rgba(11, 45, 91, 0.04)',
  md: '0 4px 12px rgba(11, 45, 91, 0.08)',
  lg: '0 12px 32px rgba(11, 45, 91, 0.12)',
  xl: '0 24px 56px rgba(11, 45, 91, 0.16)',
} as const;

export type Palette = typeof palette;
export type SemanticColors = typeof semantic;
export type Portal = keyof typeof portalChrome;
