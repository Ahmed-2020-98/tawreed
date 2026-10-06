import { Pressable, type PressableProps, View, type ViewProps, type ViewStyle } from 'react-native';
import { colors, radii, shadow } from '../theme';
import { T } from './text';

export function Card({ style, children, pad = 16, ...rest }: ViewProps & { pad?: number }) {
  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.gray[100], padding: pad }, shadow(1), style]} {...rest}>
      {children}
    </View>
  );
}

export function PressableCard({ style, children, pad = 16, ...rest }: Omit<PressableProps, 'style'> & { style?: ViewStyle; pad?: number }) {
  return (
    <Pressable style={({ pressed }) => [{ backgroundColor: '#fff', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.gray[100], padding: pad, transform: [{ scale: pressed ? 0.985 : 1 }] }, shadow(1), style]} {...rest}>
      {children}
    </Pressable>
  );
}

type Tone = 'gray' | 'brand' | 'navy' | 'amber' | 'red' | 'blue' | 'mint' | 'solid';
const TONES: Record<Tone, [string, string]> = {
  gray: [colors.gray[100], colors.gray[700]],
  brand: [colors.green[50], colors.green[800]],
  navy: [colors.navy[50], colors.navy[800]],
  amber: [colors.amber[50], colors.amber[700]],
  red: [colors.red[50], colors.red[700]],
  blue: [colors.blue[50], colors.blue[700]],
  mint: [colors.green[400], colors.navy[950]],
  solid: [colors.navy[900], '#fff'],
};

export function Badge({ label, tone = 'gray', icon, dot, style }: { label: string; tone?: Tone; icon?: React.ReactNode; dot?: boolean; style?: ViewStyle }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }, style]}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />}
      {icon}
      <T size={11} weight="bold" color={fg}>
        {label}
      </T>
    </View>
  );
}

export function Divider({ dashed, style }: { dashed?: boolean; style?: ViewStyle }) {
  return <View style={[{ height: 0, borderTopWidth: 1, borderColor: colors.gray[200], borderStyle: dashed ? 'dashed' : 'solid', marginVertical: 12 }, style]} />;
}

export function Row({ style, children, gap = 8, ...rest }: ViewProps & { gap?: number }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]} {...rest}>
      {children}
    </View>
  );
}

export function KeyValue({ k, v, strong, num }: { k: string; v: React.ReactNode; strong?: boolean; num?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
      <T size={13} color={colors.textMuted}>{k}</T>
      {typeof v === 'string' ? (
        <T size={strong ? 16 : 14} weight={strong ? 'extrabold' : 'semibold'} num={num}>
          {v}
        </T>
      ) : (
        v
      )}
    </Row>
  );
}

