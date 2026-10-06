import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, type PressableProps, View, type ViewStyle } from 'react-native';
import { colors, radii } from '../theme';
import { T } from './text';

type Variant = 'primary' | 'secondary' | 'accent' | 'outline' | 'soft' | 'ghost' | 'danger' | 'inverse';
const V: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: '#fff' },
  secondary: { bg: colors.navy[900], fg: '#fff' },
  accent: { bg: colors.green[400], fg: colors.navy[950] },
  outline: { bg: '#fff', fg: colors.text, border: colors.border },
  soft: { bg: colors.green[50], fg: colors.green[800] },
  ghost: { bg: 'transparent', fg: colors.gray[700] },
  danger: { bg: colors.red[600], fg: '#fff' },
  inverse: { bg: '#fff', fg: colors.navy[900] },
};

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title?: string;
  children?: React.ReactNode;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconEnd?: React.ReactNode;
  block?: boolean;
  style?: ViewStyle;
}

export function Button({ title, children, variant = 'primary', size = 'md', loading, disabled, icon, iconEnd, block, style, onPress, ...rest }: ButtonProps) {
  const v = V[variant];
  const h = size === 'sm' ? 38 : size === 'lg' ? 56 : 48;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={(e) => {
        void Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        { height: h, paddingHorizontal: size === 'sm' ? 14 : 20, borderRadius: radii.lg, backgroundColor: v.bg, borderWidth: v.border ? 1 : 0, borderColor: v.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: off ? 0.55 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        block && { alignSelf: 'stretch' },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon}
          {title ? <T weight="bold" size={size === 'sm' ? 13 : size === 'lg' ? 16 : 15} color={v.fg}>{title}</T> : children}
          {iconEnd && <View>{iconEnd}</View>}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ children, onPress, label, style, tone = 'light' }: { children: React.ReactNode; onPress?: () => void; label: string; style?: ViewStyle; tone?: 'light' | 'dark' | 'plain' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [{ width: 42, height: 42, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: tone === 'dark' ? 'rgba(0,0,0,0.35)' : tone === 'plain' ? 'transparent' : '#fff', borderWidth: tone === 'light' ? 1 : 0, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}
