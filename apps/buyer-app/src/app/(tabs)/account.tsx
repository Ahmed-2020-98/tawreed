import type { BuyerDashboardDto, PublicSettingsDto } from '@tawreed/contracts';
import { api, Card, colors, DeleteAccountButton, EmptyState, mirror, radii, Row, StatusBadge, T, useFormat, useRTL, useSession } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Building2, ChevronLeft, FileText, Heart, Languages, LogOut, MapPin, MessageCircle, Package, Receipt, UserRound, Wallet } from 'lucide-react-native';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

function Item({ icon: Icon, label, onPress, danger, value }: { icon: typeof Bell; label: string; onPress: () => void; danger?: boolean; value?: string }) {
  const rtl = useRTL();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? colors.gray[50] : '#fff' })}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? colors.red[50] : colors.green[50], alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={danger ? colors.red[600] : colors.green[700]} />
      </View>
      <T weight="semibold" style={{ flex: 1 }} color={danger ? colors.red[600] : colors.text}>
        {label}
      </T>
      {value && (
        <T size={13} color={colors.textMuted}>
          {value}
        </T>
      )}
      {!danger && <ChevronLeft size={18} color={colors.gray[300]} style={mirror(!rtl)} />}
    </Pressable>
  );
}

export default function AccountTab() {
  const t = useTranslations('header');
  const tn = useTranslations('account.nav');
  const tm = useTranslations('mobile');
  const tov = useTranslations('account.overview');
  const f = useFormat();
  const insets = useSafeAreaInsets();
  const { status, me, signOut } = useSession();
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<BuyerDashboardDto>('/buyer/dashboard'), enabled: status === 'authed' });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<PublicSettingsDto>('/public/settings'), staleTime: 300_000 });

  if (status !== 'authed' || !me) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
        <EmptyState icon={<UserRound size={32} color={colors.green[700]} />} title={tm('signInPrompt')} action={tm('signIn')} onAction={() => router.push('/login')} />
      </View>
    );
  }
  const c = dash.data?.credit;
  const group = (children: React.ReactNode) => <View style={{ backgroundColor: '#fff', borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray[100] }}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 30, gap: 14 }}>
      <LinearGradient colors={[colors.green[800], colors.green[950]]} style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 60, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <Row>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <T weight="black" size={20} color="#fff">
              {me.user.name.slice(0, 1)}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <T weight="extrabold" size={18} color="#fff">
              {me.user.name}
            </T>
            <T size={13} color="rgba(255,255,255,0.75)">
              {me.context.name}
            </T>
          </View>
          {me.context.verificationStatus && <StatusBadge kind="VerificationStatus" value={me.context.verificationStatus} />}
        </Row>
      </LinearGradient>
      <Card style={{ marginHorizontal: 16, marginTop: -48, gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <Wallet size={18} color={colors.green[700]} />
            <T weight="bold">{tov('credit')}</T>
          </Row>
          <Pressable onPress={() => router.push('/credit')}>
            <T size={13} weight="bold" color={colors.green[700]}>
              {tm('seeAll')}
            </T>
          </Pressable>
        </Row>
        {c ? (
          <>
            <T num weight="black" size={26} color={colors.navy[900]}>
              {f.money(c.available)}
            </T>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.gray[100], overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (Number(c.used) / Math.max(1, Number(c.limit))) * 100)}%`, height: '100%', backgroundColor: colors.green[500] }} />
            </View>
            <Row style={{ justifyContent: 'space-between' }}>
              <T num size={12} color={colors.textMuted}>
                {tov('used')} {f.money(c.used)}
              </T>
              <T num size={12} color={colors.textMuted}>
                {tov('limit')} {f.money(c.limit)}
              </T>
            </Row>
          </>
        ) : (
          <T color={colors.textMuted}>{tov('noCredit')}</T>
        )}
      </Card>
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        {group(
          <>
            <Item icon={Package} label={tn('orders')} onPress={() => router.push('/(tabs)/orders')} value={dash.data ? String(dash.data.activeOrders) : undefined} />
            <Item icon={FileText} label={tn('rfqs')} onPress={() => router.push('/rfqs')} />
            <Item icon={Receipt} label={tn('invoices')} onPress={() => router.push('/invoices')} />
            <Item icon={Heart} label={tn('favorites')} onPress={() => router.push('/favorites')} />
          </>,
        )}
        {group(
          <>
            <Item icon={Building2} label={tn('company')} onPress={() => router.push('/company')} />
            <Item icon={MapPin} label={tn('addresses')} onPress={() => router.push('/addresses')} />
            <Item icon={Bell} label={tn('notifications')} onPress={() => router.push('/notifications')} value={dash.data?.unreadNotifications ? String(dash.data.unreadNotifications) : undefined} />
            <Item icon={Languages} label={tm('language')} onPress={() => router.push('/settings')} value={f.locale === 'ar' ? 'العربية' : 'English'} />
          </>,
        )}
        {group(
          <>
            <Item icon={MessageCircle} label={tm('whatsapp')} onPress={() => settings.data && void Linking.openURL(`https://wa.me/${settings.data.supportWhatsapp.replace('+', '')}`)} />
            <Item
              icon={LogOut}
              danger
              label={t('logout')}
              onPress={() =>
                Alert.alert(tm('logoutConfirm'), undefined, [
                  { text: '✕', style: 'cancel' },
                  { text: t('logout'), style: 'destructive', onPress: () => void signOut() },
                ])
              }
            />
          </>,
        )}
        <DeleteAccountButton />
        <T size={11} color={colors.textSubtle} center>
          {tm('version', { v: '1.0.0' })}
        </T>
      </View>
    </ScrollView>
  );
}
