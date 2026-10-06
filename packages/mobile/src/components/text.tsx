import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, type FontWeightName, fonts } from '../theme';

export interface TProps extends TextProps {
  weight?: FontWeightName;
  size?: number;
  color?: string;
  /** Latin numerals face (prices, counts). */
  num?: boolean;
  center?: boolean;
  style?: TextStyle | TextStyle[];
}

/** Brand text: Cairo by weight (RN chooses weights by family), Montserrat for numbers. */
export function T({ weight = 'regular', size = 15, color = colors.text, num, center, style, ...rest }: TProps) {
  const family = num ? (weight === 'black' || weight === 'extrabold' ? fonts.numberBlack : fonts.number) : fonts[weight];
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      style={[{ fontFamily: family, fontSize: size, color, lineHeight: Math.round(size * (num ? 1.3 : 1.6)), textAlign: center ? 'center' : undefined, writingDirection: 'auto' }, style]}
      {...rest}
    />
  );
}
