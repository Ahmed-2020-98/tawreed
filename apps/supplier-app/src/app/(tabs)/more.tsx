import type { DriverDto } from '@tawreed/contracts';
import { api, Button, Card, Chip, colors, DeleteAccountButton, Row, Screen, T, useLocale, useSession } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Alert, View } from 'react-native';
import { useTranslations } from 'use-intl';

export default function More() {
  const t = useTranslations('supplier');
  const tm = useTranslations('mobile');
  const th = useTranslations('header');
  const { me, signOut } = useSession();
  const { locale, setLocale } = useLocale();
  const drivers = useQuery({ queryKey: ['supplier', 'drivers'], queryFn: () => api.get<DriverDto[]>('/supplier/drivers') });
  return (
    <Screen back={false} title={t('moreTitle')}>
      <Card pad={16} style={{ gap: 4 }}>
        <T weight="extrabold" size={17}>
          {me?.context.name}
        </T>
        <T color={colors.textMuted}>{me?.user.name}</T>
      </Card>
      <T weight="extrabold" size={16}>
        {t('drivers')}
      </T>
      <Card pad={0}>
        {(drivers.data ?? []).map((d, i) => (
          <Row key={d.id} style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderColor: colors.gray[100] }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.isOnline ? colors.green[500] : colors.gray[300] }} />
            <View style={{ flex: 1 }}>
              <T weight="bold">{d.name}</T>
              <T size={12} color={colors.textMuted}>
                {d.vehicle?.plateNumber ?? '—'} · {d.isOnline ? t('onlineNow') : t('offlineNow')}
              </T>
            </View>
            <T num size={12} color={colors.textMuted}>
              {d.activeShipments}
            </T>
          </Row>
        ))}
        {drivers.data?.length === 0 && (
          <T center color={colors.textMuted} style={{ padding: 16 }}>
            {t('fleetEmpty')}
          </T>
        )}
      </Card>
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
