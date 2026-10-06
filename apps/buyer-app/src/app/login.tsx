import { colors, PhoneOtpFlow, T, useSession } from '@tawreed/mobile';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';
import logoWhite from '../../assets/images/logo-horizontal-white.png';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

export default function Login() {
  const t = useTranslations('meta');
  const tm = useTranslations('mobile');
  const insets = useSafeAreaInsets();
  const { reload } = useSession();
  return (
    <PhoneOtpFlow
      expect="BUYER"
      wrongAppMessage={tm('notBuyer')}
      onAuthenticated={async () => {
        await reload();
        router.dismissAll();
        router.replace('/(tabs)');
      }}
      onRegistrationRequired={(token, phone) => router.replace({ pathname: '/register', params: { token, phone } })}
      hero={
        <LinearGradient colors={[colors.green[700], colors.green[950]]} style={{ paddingTop: insets.top + 28, paddingBottom: 36, alignItems: 'center', gap: 10, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
          <Image source={logoWhite} style={{ width: 180, height: 53 }} contentFit="contain" />
          <T color={colors.green[200]} weight="semibold">
            {t('tagline')}
          </T>
          <View style={{ height: 4 }} />
        </LinearGradient>
      }
    />
  );
}
