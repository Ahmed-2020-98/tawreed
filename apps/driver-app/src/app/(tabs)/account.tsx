import { Button, Card, Chip, colors, DeleteAccountButton, KeyValue, Row, Screen, T, useLocale, useSession } from '@tawreed/mobile';
import { Alert, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { useDriverSummary } from '@/lib/driver';

export default function Account() {
  const t = useTranslations('driver');
  const tm = useTranslations('mobile');
  const th = useTranslations('header');
  const { me, signOut } = useSession();
  const { locale, setLocale } = useLocale();
  const d = useDriverSummary().data?.driver;
  return (
    <Screen back={false} title={tm('tabs.account')}>
      <Card pad={16} style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.navy[50], alignItems: 'center', justifyContent: 'center' }}>
          <T weight="black" size={24} color={colors.navy[900]}>
            {me?.user.name.slice(0, 1)}
          </T>
        </View>
        <T weight="extrabold" size={18}>
          {me?.user.name}
        </T>
        <T num color={colors.textMuted}>
          {me?.user.phone?.replace('+966', '0')}
        </T>
        {d?.supplier && <T size={12} color={colors.textMuted}>{d.supplier.name}</T>}
      </Card>
      {d && (
        <Card pad={14}>
          {d.vehicle && <KeyValue k={t('vehicle')} v={`${d.vehicle.plateNumber} · ${d.vehicle.type}`} />}
          <KeyValue k={t('deliveries')} v={String(d.deliveriesCount)} num />
          <KeyValue k={t('rating')} v={d.ratingAvg} num />
        </Card>
      )}
      <Card pad={14} style={{ gap: 8 }}>
        <T weight="bold">{tm('language')}</T>
        <Row>
          <Chip label={tm('arabic')} active={locale === 'ar'} onPress={() => void setLocale('ar')} />
          <Chip label={tm('english')} active={locale === 'en'} onPress={() => void setLocale('en')} />
        </Row>
      </Card>
      <Button
        variant="outline"
        title={th('logout')}
        onPress={() =>
          Alert.alert(tm('logoutConfirm'), undefined, [
            { text: '✕', style: 'cancel' },
            { text: th('logout'), style: 'destructive', onPress: () => void signOut() },
          ])
        }
      />
      <DeleteAccountButton />
    </Screen>
  );
}
