import { colors, PhoneOtpFlow, T, useSession } from '@tawreed/mobile';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Store } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import logoWhite from '../../assets/images/logo-horizontal-white.png';

export default function Login() {
  const tm = useTranslations('mobile');
  const ts = useTranslations('supplier');
  const insets = useSafeAreaInsets();
  const { reload } = useSession();
  return (
    <PhoneOtpFlow
      expect="SUPPLIER"
      wrongAppMessage={tm('notSupplier')}
      onAuthenticated={async () => {
        await reload();
        router.replace('/(tabs)');
      }}
      hero={
        <LinearGradient colors={[colors.navy[800], colors.navy[950]]} style={{ paddingTop: insets.top + 28, paddingBottom: 32, alignItems: 'center', gap: 12, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
          <Image source={logoWhite} style={{ width: 170, height: 50 }} contentFit="contain" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
            <Store size={15} color={colors.green[400]} />
            <T size={12} weight="bold" color="#fff">
              {ts('supplierApp')}
            </T>
          </View>
        </LinearGradient>
      }
    />
  );
}
