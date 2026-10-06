import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps, View, type ViewStyle } from 'react-native';
import { useRTL } from '../i18n';
import { colors, fonts, radii } from '../theme';
import { T } from './text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  start?: React.ReactNode;
  end?: React.ReactNode;
  containerStyle?: ViewStyle;
  /** Force LTR content (phone numbers, IBANs, codes). */
  ltr?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, hint, start, end, containerStyle, ltr, style, onFocus, onBlur, ...rest }, ref) {
  const [focus, setFocus] = useState(false);
  const rtl = useRTL();
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && <T weight="semibold" size={13} color={colors.gray[700]}>{label}</T>}
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: radii.lg, borderWidth: 1, borderColor: error ? colors.red[500] : focus ? colors.green[500] : colors.border, backgroundColor: '#fff', paddingHorizontal: 12, gap: 8 }}>
        {start}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.gray[400]}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          style={[{ flex: 1, height: '100%', fontFamily: ltr ? fonts.number : fonts.medium, fontSize: 15, color: colors.text, textAlign: ltr ? 'left' : rtl ? 'right' : 'left', writingDirection: ltr ? 'ltr' : 'auto' }, style]}
          {...rest}
        />
        {end}
      </View>
      {error ? <T size={12} color={colors.red[600]} weight="semibold">{error}</T> : hint ? <T size={12} color={colors.textMuted}>{hint}</T> : null}
    </View>
  );
});
