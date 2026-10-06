import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, View, type ViewStyle } from 'react-native';
import { colors, radii } from '../theme';
import { Button } from './button';
import { T } from './text';

export function EmptyState({ icon, title, body, action, onAction, style }: { icon?: React.ReactNode; title: string; body?: string; action?: string; onAction?: () => void; style?: ViewStyle }) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 }, style]}>
      {icon && <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.green[50], alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>{icon}</View>}
      <T weight="extrabold" size={18} center>
        {title}
      </T>
      {body && (
        <T color={colors.textMuted} center size={14}>
          {body}
        </T>
      )}
      {action && <Button title={action} onPress={onAction} style={{ marginTop: 8 }} />}
    </View>
  );
}

export function Skeleton({ style }: { style?: ViewStyle }) {
  const [o] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{ backgroundColor: colors.gray[200], borderRadius: radii.md, height: 16, opacity: o }, style]} />;
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
