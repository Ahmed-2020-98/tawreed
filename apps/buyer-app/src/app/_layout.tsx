import { TawreedRoot } from '@tawreed/mobile';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <TawreedRoot expect="BUYER">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#F4F6F8' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </TawreedRoot>
  );
}
