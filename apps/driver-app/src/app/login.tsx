import { colors, PhoneOtpFlow, T, useSession } from '@tawreed/mobile';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import logo from '../../assets/images/logo-horizontal.png';

export default function Login() {
  const tm = useTranslations('mobile');
  const insets = useSafeAreaInsets();
  const { reload } = useSession();
  return (
    <PhoneOtpFlow
      expect="DRIVER"
      wrongAppMessage={tm('notDriver')}
      onAuthenticated={async () => {
        await reload();
        router.replace('/(tabs)');
      }}
      hero={
        <View style={{ paddingTop: insets.top + 32, paddingBottom: 28, alignItems: 'center', gap: 12, backgroundColor: colors.gray[50], borderBottomWidth: 1, borderColor: colors.gray[100] }}>
          <Image source={logo} style={{ width: 170, height: 50 }} contentFit="contain" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.navy[900], paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
            <Truck size={15} color={colors.green[400]} />
            <T size={12} weight="bold" color="#fff">
              {tm('driverApp')}
            </T>
          </View>
        </View>
      }
    />
  );
}
