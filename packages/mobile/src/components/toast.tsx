import { ApiError } from '@tawreed/api-client';
import { CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadow } from '../theme';
import { T } from './text';

type Kind = 'success' | 'error';
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => undefined);
export const useToast = () => useContext(Ctx);

/** Shows the API's localized message for ApiErrors. */
export function useErrorToast() {
  const toast = useToast();
  return useCallback((e: unknown, fallback = 'Error') => toast(e instanceof ApiError ? e.message : fallback, 'error'), [toast]);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ text: string; kind: Kind } | null>(null);
  const [y] = useState(() => new Animated.Value(-120));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (text: string, kind: Kind = 'success') => {
      setMsg({ text, kind });
      if (timer.current) clearTimeout(timer.current);
      Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      timer.current = setTimeout(() => Animated.timing(y, { toValue: -120, duration: 220, useNativeDriver: true }).start(), 2600);
    },
    [y],
  );
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, transform: [{ translateY: y }] }}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: msg.kind === 'error' ? colors.red[600] : colors.navy[900], borderRadius: radii.xl, paddingHorizontal: 16, paddingVertical: 12 }, shadow(3)]}>
            {msg.kind === 'error' ? <AlertTriangle size={20} color="#fff" /> : <CheckCircle2 size={20} color={colors.green[400]} />}
            <T color="#fff" weight="bold" size={14} style={{ flex: 1 }}>
              {msg.text}
            </T>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}
