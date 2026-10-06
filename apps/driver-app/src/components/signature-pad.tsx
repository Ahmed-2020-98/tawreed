import { colors, radii, T } from '@tawreed/mobile';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';

export interface SignaturePadHandle {
  /** PNG file URI of the drawn signature, or null when empty. */
  capture: () => Promise<string | null>;
  clear: () => void;
}

/** Finger signature pad (react-native-svg paths) exported to PNG with view-shot. */
export const SignaturePad = forwardRef<SignaturePadHandle, { placeholder: string; clearLabel: string }>(function SignaturePad({ placeholder, clearLabel }, ref) {
  const [paths, setPaths] = useState<string[]>([]);
  const current = useRef('');
  const view = useRef<View>(null);
  const [live, setLive] = useState('');
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        current.current = `M${e.nativeEvent.locationX.toFixed(1)},${e.nativeEvent.locationY.toFixed(1)}`;
        setLive(current.current);
      },
      onPanResponderMove: (e) => {
        current.current += ` L${e.nativeEvent.locationX.toFixed(1)},${e.nativeEvent.locationY.toFixed(1)}`;
        setLive(current.current);
      },
      onPanResponderRelease: () => {
        const p = current.current;
        setPaths((s) => [...s, p]);
        setLive('');
      },
    }),
  ).current;
  useImperativeHandle(ref, () => ({
    capture: async () => (paths.length ? captureRef(view, { format: 'png', quality: 0.9, result: 'tmpfile' }) : null),
    clear: () => setPaths([]),
  }));
  return (
    <View>
      <View ref={view} collapsable={false} style={{ height: 170, borderRadius: radii.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gray[300], backgroundColor: '#fff', overflow: 'hidden' }} {...responder.panHandlers}>
        {!paths.length && !live && (
          <T color={colors.gray[300]} center style={{ marginTop: 70 }}>
            {placeholder}
          </T>
        )}
        <Svg style={{ position: 'absolute', inset: 0 }}>
          {[...paths, live].filter(Boolean).map((d, i) => (
            <Path key={i} d={d} stroke={colors.navy[900]} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      </View>
      <Pressable onPress={() => setPaths([])} style={{ alignSelf: 'flex-end', padding: 6 }}>
        <T size={12} weight="bold" color={colors.red[600]}>
          {clearLabel}
        </T>
      </Pressable>
    </View>
  );
});
