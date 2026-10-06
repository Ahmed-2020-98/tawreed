import type { ProductCardDto } from '@tawreed/contracts';
import { colors, deviceUrl, radii, Row, shadow, T, useFormat } from '@tawreed/mobile';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Heart, ShoppingCart } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { useAddToCart } from '@/lib/cart';
import { flag } from '@/lib/country';

/** List row card from mockup #2: image start, details, price + cart button. */
export function ProductRow({ p }: { p: ProductCardDto }) {
  const f = useFormat();
  const t = useTranslations('store');
  const tp = useTranslations('product');
  const { add, isPending } = useAddToCart();
  const o = p.bestOffer;
  return (
    <Pressable onPress={() => router.push(`/product/${p.slug}`)} style={({ pressed }) => [{ flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: radii.xl, padding: 10, borderWidth: 1, borderColor: colors.gray[100], transform: [{ scale: pressed ? 0.99 : 1 }] }, shadow(1)]}>
      <View style={{ width: 118, height: 118, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.gray[100] }}>
        {p.image && <Image source={deviceUrl(p.image.thumbUrl ?? p.image.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />}
        <View style={{ position: 'absolute', top: 6, start: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Heart size={15} color={p.isFavorite ? colors.red[500] : colors.gray[500]} fill={p.isFavorite ? colors.red[500] : 'transparent'} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T weight="bold" size={15} numberOfLines={2}>
          {p.name}
        </T>
        <T size={12} color={colors.textMuted}>
          {flag(p.originCountry)} {p.brand?.name ?? p.category.name}
        </T>
        {p.offersCount > 1 && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.gray[100], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
            <T size={11} weight="semibold" color={colors.gray[700]}>
              {tp('otherSuppliersCount', { count: p.offersCount })}
            </T>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {o ? (
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Row gap={4}>
                <T num weight="extrabold" size={17} color={colors.navy[900]}>
                  {f.money(o.effectivePrice, { symbol: false })}
                </T>
                <T size={12} color={colors.textMuted}>
                  {f.locale === 'ar' ? 'ر.س' : 'SAR'} / {o.unit.name}
                </T>
              </Row>
              <T size={11} color={colors.textSubtle}>
                {tp('moq', { qty: f.qty(o.minOrderQty), unit: o.unit.name })}
              </T>
            </View>
            <Pressable accessibilityLabel={t('addToCart')} disabled={isPending} onPress={() => add(o.id, o.minOrderQty)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radii.lg, backgroundColor: colors.green[700], alignItems: 'center', justifyContent: 'center', opacity: pressed || isPending ? 0.7 : 1 })}>
              <ShoppingCart size={20} color="#fff" />
            </Pressable>
          </Row>
        ) : (
          <T size={13} weight="semibold" color={colors.textMuted}>
            {t('onRequest')}
          </T>
        )}
      </View>
    </Pressable>
  );
}

/** Compact grid tile (home rails). */
export function ProductTile({ p, width = 160 }: { p: ProductCardDto; width?: number }) {
  const f = useFormat();
  const o = p.bestOffer;
  const discount = o?.deal ? Math.round((1 - Number(o.effectivePrice) / Number(o.price)) * 100) : 0;
  return (
    <Pressable onPress={() => router.push(`/product/${p.slug}`)} style={({ pressed }) => [{ width, backgroundColor: '#fff', borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray[100], transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow(1)]}>
      <View style={{ height: width - 16, backgroundColor: colors.gray[100] }}>
        {p.image && <Image source={deviceUrl(p.image.thumbUrl ?? p.image.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />}
        {discount > 0 && (
          <View style={{ position: 'absolute', top: 8, start: 8, backgroundColor: colors.red[600], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <T num size={11} weight="bold" color="#fff">
              -{discount}%
            </T>
          </View>
        )}
      </View>
      <View style={{ padding: 10, gap: 2 }}>
        <T weight="bold" size={13} numberOfLines={2} style={{ minHeight: 42 }}>
          {p.name}
        </T>
        {o && (
          <T num weight="extrabold" size={15} color={colors.navy[900]}>
            {f.money(o.effectivePrice)}
          </T>
        )}
      </View>
    </Pressable>
  );
}
