import type { BannerDto, HomeDto, HomeSectionDto, PublicSettingsDto } from '@tawreed/contracts';
import { api, colors, deviceUrl, mirror, radii, Row, shadow, T, useRTL, useSession } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Building2, ChevronLeft, ScanLine, Search, ShieldCheck, Truck } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { ProductTile } from '@/components/store/product-card';
import logo from '../../../assets/images/logo-horizontal.png';
import { bannerRoute } from '@/lib/links';

function SectionHead({ title, href }: { title: string; href?: string | null }) {
  const t = useTranslations('mobile');
  const rtl = useRTL();
  return (
    <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 }}>
      <T weight="extrabold" size={19}>
        {title}
      </T>
      {href && (
        <Pressable onPress={() => router.push(href as never)} hitSlop={8}>
          <Row gap={2}>
            <T size={13} weight="bold" color={colors.green[700]}>
              {t('seeAll')}
            </T>
            <ChevronLeft size={16} color={colors.green[700]} style={mirror(!rtl)} />
          </Row>
        </Pressable>
      )}
    </Row>
  );
}

function Hero({ banner }: { banner: BannerDto }) {
  const tn = useTranslations('store');
  const rtl = useRTL();
  return (
    <Pressable onPress={() => router.push(bannerRoute(banner) as never)} style={[{ marginHorizontal: 16, height: 190, borderRadius: radii['2xl'], overflow: 'hidden' }, shadow(2)]}>
      <Image source={deviceUrl(banner.imageUrl)} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
      <LinearGradient colors={['rgba(5,26,56,0)', 'rgba(5,26,56,0.35)', 'rgba(5,26,56,0.85)']} start={{ x: rtl ? 0 : 1, y: 0.5 }} end={{ x: rtl ? 1 : 0, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ flex: 1, justifyContent: 'center', padding: 18, maxWidth: '68%', gap: 6 }}>
        <T weight="black" size={21} color="#fff" style={{ lineHeight: 30 }}>
          {banner.title}
        </T>
        {banner.subtitle && (
          <T size={12} color="rgba(255,255,255,0.85)" numberOfLines={2}>
            {banner.subtitle}
          </T>
        )}
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 }}>
          <T weight="bold" size={13} color={colors.navy[900]}>
            {banner.ctaLabel ?? tn('requestQuote')}
          </T>
        </View>
      </View>
    </Pressable>
  );
}

function Section({ s }: { s: HomeSectionDto }) {
  const rtl = useRTL();
  if (!s.items.length) return null;
  if (s.type === 'CATEGORIES') {
    return (
      <View>
        <SectionHead title={s.title} href="/categories" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 }}>
          {s.items.slice(0, 6).map((c) => (
            <View key={c.slug} style={{ width: '33.33%', padding: 4 }}>
              <Pressable onPress={() => router.push(`/c/${c.slug}`)} style={[{ backgroundColor: '#fff', borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray[100] }, shadow(1)]}>
                <Image source={deviceUrl(c.imageUrl?.replace('_md.', '_thumb.'))} style={{ width: '100%', aspectRatio: 1.25 }} contentFit="cover" />
                <T weight="bold" size={13} center numberOfLines={1} style={{ paddingVertical: 8 }}>
                  {c.name}
                </T>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    );
  }
  if (s.type === 'PRODUCTS' || s.type === 'DEALS' || s.type === 'BUY_AGAIN') {
    return (
      <View>
        <SectionHead title={s.title} href={s.type === 'DEALS' ? '/c/deals' : null} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}>
          {s.items.slice(0, 10).map((p) => (
            <ProductTile key={p.id} p={p} />
          ))}
        </ScrollView>
      </View>
    );
  }
  if (s.type === 'BANNER_STRIP') {
    const b = s.items[0]!;
    return (
      <Pressable onPress={() => router.push(bannerRoute(b) as never)} style={{ marginHorizontal: 16, height: 110, borderRadius: radii.xl, overflow: 'hidden', backgroundColor: colors.green[800] }}>
        <Image source={deviceUrl(b.imageUrl)} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
        <LinearGradient colors={['rgba(3,43,37,0.1)', 'rgba(3,43,37,0.9)']} start={{ x: rtl ? 0 : 1, y: 0.5 }} end={{ x: rtl ? 1 : 0, y: 0.5 }} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ flex: 1, justifyContent: 'center', padding: 16, maxWidth: '70%' }}>
          <T weight="black" size={18} color="#fff">
            {b.title}
          </T>
          {b.subtitle && (
            <T size={12} color="rgba(255,255,255,0.85)" numberOfLines={1}>
              {b.subtitle}
            </T>
          )}
        </View>
      </Pressable>
    );
  }
  return null;
}

export default function Home() {
  const t = useTranslations('mobile');
  const insets = useSafeAreaInsets();
  const { status } = useSession();
  const home = useQuery({ queryKey: ['home'], queryFn: () => api.get<HomeDto>('/public/home') });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<PublicSettingsDto>('/public/settings'), staleTime: 300_000 });
  const values = [
    { icon: Truck, label: t('values.shipping') },
    { icon: ShieldCheck, label: t('values.payment') },
    { icon: Building2, label: t('values.bulk') },
  ];
  const hero = home.data?.banners[0];
  void settings;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 24, gap: 20 }} refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => void home.refetch()} tintColor={colors.primary} />}>
      <View style={{ backgroundColor: '#fff', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, gap: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Image source={logo} style={{ width: 132, height: 39 }} contentFit="contain" />
            <T size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
              {t('brandSub')}
            </T>
          </View>
          <Pressable accessibilityLabel="notifications" onPress={() => router.push(status === 'authed' ? '/notifications' : '/login')} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.gray[200], alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={22} color={colors.navy[900]} />
          </Pressable>
        </Row>
        <Row>
          <Pressable onPress={() => router.push('/search')} style={{ flex: 1, height: 48, borderRadius: radii.lg, backgroundColor: colors.gray[50], borderWidth: 1, borderColor: colors.gray[200], flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
            <Search size={19} color={colors.gray[400]} />
            <T color={colors.gray[400]}>{t('searchPlaceholder')}</T>
          </Pressable>
          <Pressable accessibilityLabel={t('scan')} onPress={() => router.push('/scan')} style={{ width: 48, height: 48, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.gray[200], alignItems: 'center', justifyContent: 'center' }}>
            <ScanLine size={22} color={colors.navy[900]} />
          </Pressable>
        </Row>
      </View>

      {hero && <Hero banner={hero} />}

      <Row style={{ marginHorizontal: 16, backgroundColor: '#fff', borderRadius: radii.xl, paddingVertical: 14, justifyContent: 'space-around', borderWidth: 1, borderColor: colors.gray[100] }}>
        {values.map((v) => (
          <View key={v.label} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            <v.icon size={24} color={colors.green[700]} strokeWidth={1.8} />
            <T size={11} weight="bold" center color={colors.navy[900]}>
              {v.label}
            </T>
          </View>
        ))}
      </Row>

      {home.data?.sections.map((s) => (
        <Section key={s.id} s={s} />
      ))}
    </ScrollView>
  );
}
