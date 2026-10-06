import { palette, portalChrome, radii, semantic, spacing } from '@tawreed/tokens';
import type { ViewStyle } from 'react-native';

export { palette, radii, semantic, spacing, portalChrome };

export const colors = {
  ...semantic,
  navy: palette.navy,
  green: palette.green,
  gray: palette.gray,
  amber: palette.amber,
  red: palette.red,
  blue: palette.blue,
  sand: { 50: '#FCFAF6', 100: '#F7F1E7', 200: '#EFE3CF', 300: '#E2CFAE', 500: '#B8925A', 700: '#7A5A2E' },
} as const;

/** Font families loaded by useTawreedFonts (RN picks weights by family, not fontWeight). */
export const fonts = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  extrabold: 'Cairo_800ExtraBold',
  black: 'Cairo_900Black',
  number: 'Montserrat_700Bold',
  numberBlack: 'Montserrat_800ExtraBold',
} as const;
export type FontWeightName = keyof typeof fonts;

export const shadow = (level: 1 | 2 | 3 = 1): ViewStyle => ({
  shadowColor: palette.navy[900],
  shadowOpacity: [0.06, 0.1, 0.16][level - 1],
  shadowRadius: [4, 10, 20][level - 1],
  shadowOffset: { width: 0, height: [1, 4, 10][level - 1]! },
  elevation: [1, 3, 8][level - 1],
});

/** Mirrors a directional icon (drawn for LTR) when the layout is RTL. */
export const mirror = (rtl: boolean): ViewStyle => (rtl ? { transform: [{ scaleX: -1 }] } : {});
