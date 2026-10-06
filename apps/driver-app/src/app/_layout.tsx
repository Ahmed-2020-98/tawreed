import { TawreedRoot } from '@tawreed/mobile';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <TawreedRoot expect="DRIVER">
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#F4F6F8' } }} />
    </TawreedRoot>
  );
}
