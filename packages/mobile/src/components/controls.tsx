import { Check, Minus, Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View, type ViewStyle } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { T } from './text';

export function QuantityStepper({ value, onChange, min = 1, max, step = 1, size = 'md' }: { value: number; onChange: (v: number) => void; min?: number; max?: number | null; step?: number; size?: 'sm' | 'md' }) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => {
    let n = Math.max(min, Number.isFinite(v) ? v : min);
    if (max != null) n = Math.min(max, n);
    return Number((Math.round((n - min) / step) * step + min).toFixed(3));
  };
  const h = size === 'sm' ? 36 : 46;
  const btn = (icon: React.ReactNode, disabled: boolean, fn: () => void, label: string) => (
    <Pressable accessibilityLabel={label} disabled={disabled} onPress={fn} style={{ width: h, height: h, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      {icon}
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: '#fff', height: h }}>
      {btn(<Minus size={18} color={colors.gray[700]} />, value <= min, () => onChange(clamp(value - step)), 'decrease')}
      <TextInput
        accessibilityLabel="Quantity"
        value={draft ?? String(value)}
        keyboardType="decimal-pad"
        onFocus={() => setDraft(String(value))}
        onChangeText={(v) => setDraft(v.replace(/[^\d.]/g, ''))}
        onBlur={() => {
          const v = clamp(Number(draft ?? value));
          setDraft(null);
          if (v !== value) onChange(v);
        }}
        style={{ minWidth: 56, height: '100%', textAlign: 'center', fontFamily: fonts.number, fontSize: 16, color: colors.text, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }}
      />
      {btn(<Plus size={18} color={colors.gray[700]} />, max != null && value >= max, () => onChange(clamp(value + step)), 'increase')}
    </View>
  );
}

export function Segmented<T extends string>({ value, onChange, options, style }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: colors.gray[100], borderRadius: radii.lg, padding: 4, gap: 4 }, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 8, borderRadius: radii.md, alignItems: 'center', backgroundColor: on ? '#fff' : 'transparent', borderWidth: on ? 1 : 0, borderColor: on ? colors.green[600] : 'transparent' }}>
            <T weight={on ? 'bold' : 'semibold'} size={13} color={on ? colors.green[800] : colors.gray[500]}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, borderWidth: 1, borderColor: active ? colors.green[600] : colors.border, backgroundColor: active ? colors.green[50] : '#fff' }}>
      {icon}
      <T size={13} weight={active ? 'bold' : 'semibold'} color={active ? colors.green[800] : colors.gray[700]}>
        {label}
      </T>
    </Pressable>
  );
}

/** Horizontal progress steps (checkout / order progress), mockup style. */
export function Steps({ steps, current, icons }: { steps: string[]; current: number; icons?: React.ReactNode[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {steps.map((label, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            {i > 0 && <View style={{ position: 'absolute', top: 17, end: '50%', width: '100%', height: 2, backgroundColor: i <= current ? colors.green[600] : colors.gray[200] }} />}
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? colors.green[700] : '#fff', borderWidth: 2, borderColor: done || on ? colors.green[700] : colors.gray[200] }}>
              {done ? <Check size={18} color="#fff" strokeWidth={3} /> : (icons?.[i] ?? <T num weight="bold" size={13} color={on ? colors.green[700] : colors.gray[400]}>{i + 1}</T>)}
            </View>
            <T size={11} weight={on ? 'bold' : 'semibold'} color={on ? colors.text : done ? colors.green[800] : colors.gray[400]} center style={{ marginTop: 6 }}>
              {label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

export function OtpInput({ value, onChange, onComplete, length = 6, invalid }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; length?: number; invalid?: boolean }) {
  const ref = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={{ direction: 'ltr', flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
      {Array.from({ length }, (_, i) => {
        const on = i === value.length;
        return (
          <View key={i} style={{ width: 48, height: 58, borderRadius: radii.lg, borderWidth: on ? 2 : 1, borderColor: invalid ? colors.red[500] : on ? colors.green[600] : colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <T num weight="extrabold" size={22} color={colors.navy[900]}>
              {value[i] ?? ''}
            </T>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        autoFocus
        value={value}
        onChangeText={(t) => {
          const v = t.replace(/\D/g, '').slice(0, length);
          onChange(v);
          if (v.length === length) onComplete?.(v);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        accessibilityLabel="OTP"
        style={{ position: 'absolute', opacity: 0.01, width: 1, height: 1 }}
      />
    </Pressable>
  );
}
