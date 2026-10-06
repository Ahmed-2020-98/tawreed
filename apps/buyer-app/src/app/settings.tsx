import { Card, colors, radii, Screen, T, useLocale } from '@tawreed/mobile';
import { Check } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useTranslations } from 'use-intl';

export default function Settings() {
  const tm = useTranslations('mobile');
  const { locale, setLocale } = useLocale();
  return (
    <Screen title={tm('language')}>
      <Card pad={0}>
        {(['ar', 'en'] as const).map((l, i) => (
          <Pressable key={l} onPress={() => void setLocale(l)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: i ? 1 : 0, borderColor: colors.gray[100], borderRadius: radii.xl }}>
            <T weight="bold">{l === 'ar' ? tm('arabic') : tm('english')}</T>
            {locale === l && <Check size={20} color={colors.green[700]} />}
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
