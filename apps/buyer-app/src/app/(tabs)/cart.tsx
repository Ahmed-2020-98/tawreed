import type { CartDto, CartGroupDto, CartLineDto } from '@tawreed/contracts';
import { api, Button, Card, colors, deviceUrl, EmptyState, Input, QuantityStepper, radii, Row, Screen, T, useFormat, useSession } from '@tawreed/mobile';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AlertTriangle, CheckCircle2, ShoppingCart, Tag, Trash2, TrendingDown, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { Totals } from '@/components/totals';
import { useCart, useCartMutation } from '@/lib/cart';

function Line({ line }: { line: CartLineDto }) {
  const t = useTranslations('cart');
  const f = useFormat();
  const update = useCartMutation((qty: number) => api.patch<CartDto>(`/buyer/cart/items/${line.id}`, { qty: String(qty) }));
  const remove = useCartMutation(() => api.delete<CartDto>(`/buyer/cart/items/${line.id}`));
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, opacity: update.isPending || remove.isPending ? 0.5 : 1 }}>
      <Pressable onPress={() => router.push(`/product/${line.product.slug}`)}>
        <Image source={deviceUrl(line.product.image?.thumbUrl ?? line.product.image?.url)} style={{ width: 76, height: 76, borderRadius: radii.lg, backgroundColor: colors.gray[100] }} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <T weight="bold" size={14} numberOfLines={2}>
          {line.product.name}
        </T>
        <T size={12} color={colors.textMuted}>
          {line.unit.name} · <T num size={12} color={colors.textMuted}>{f.money(line.unitPrice)}</T>
        </T>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <QuantityStepper size="sm" value={Number(line.qty)} min={Number(line.minOrderQty)} step={Number(line.qtyStep)} max={line.maxOrderQty ? Number(line.maxOrderQty) : null} onChange={(q) => update.mutate(q)} />
          <T num weight="extrabold" color={colors.navy[900]}>
            {f.money(line.lineTotal)}
          </T>
        </Row>
        {line.nextTier && (
          <Row gap={4} style={{ backgroundColor: colors.green[50], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
            <TrendingDown size={13} color={colors.green[800]} />
            <T num size={11} weight="semibold" color={colors.green[800]}>
              {t('nextTier', { qty: f.qty(Number(line.nextTier.minQty) - Number(line.qty)), price: f.money(line.nextTier.price) })}
            </T>
          </Row>
        )}
        {line.issues.map((i) => (
          <T key={i.code} size={11} color={colors.amber[700]} weight="semibold">
            {i.message}
          </T>
        ))}
      </View>
      <Pressable accessibilityLabel={t('remove')} onPress={() => remove.mutate(undefined)} hitSlop={8}>
        <Trash2 size={18} color={colors.gray[400]} />
      </Pressable>
    </View>
  );
}

function Group({ g }: { g: CartGroupDto }) {
  const t = useTranslations('cart');
  const f = useFormat();
  const toMin = Number(g.amountToMinOrder);
  const toFree = g.amountToFreeDelivery ? Number(g.amountToFreeDelivery) : 0;
  const pct = toMin > 0 ? (Number(g.minOrderValue) - toMin) / Number(g.minOrderValue) : g.freeDeliveryThreshold && toFree > 0 ? (Number(g.freeDeliveryThreshold) - toFree) / Number(g.freeDeliveryThreshold) : 1;
  return (
    <Card pad={14}>
      <Row>
        <Image source={deviceUrl(g.supplier.logoUrl)} style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: colors.gray[100] }} />
        <T weight="extrabold" style={{ flex: 1 }}>
          {g.supplier.name}
        </T>
      </Row>
      <View style={{ marginTop: 10, gap: 6 }}>
        {!g.covered ? (
          <Row gap={6}>
            <AlertTriangle size={14} color={colors.red[600]} />
            <T size={12} color={colors.red[600]} weight="semibold">
              {t('notCovered')}
            </T>
          </Row>
        ) : toMin > 0 ? (
          <T num size={12} weight="semibold" color={colors.amber[700]}>
            {t('minOrderLeft', { amount: f.money(toMin), min: f.money(g.minOrderValue) })}
          </T>
        ) : toFree > 0 ? (
          <T num size={12} weight="semibold" color={colors.gray[600]}>
            {t('freeDeliveryLeft', { amount: f.money(toFree) })}
          </T>
        ) : (
          <Row gap={6}>
            <CheckCircle2 size={14} color={colors.green[700]} />
            <T size={12} weight="bold" color={colors.green[700]}>
              {Number(g.deliveryFee) === 0 ? t('freeDeliveryMet') : t('minOrderMet')}
            </T>
          </Row>
        )}
        <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.gray[100], overflow: 'hidden' }}>
          <View style={{ width: `${Math.max(4, Math.min(100, pct * 100))}%`, height: '100%', backgroundColor: toMin > 0 ? colors.amber[500] : colors.green[500] }} />
        </View>
      </View>
      {g.items.map((l, i) => (
        <View key={l.id} style={{ borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.gray[100] }}>
          <Line line={l} />
        </View>
      ))}
    </Card>
  );
}

export default function CartTab() {
  const t = useTranslations('cart');
  const tm = useTranslations('mobile');
  const f = useFormat();
  const { status } = useSession();
  const { data: cart, isLoading, refetch, isRefetching } = useCart();
  const [code, setCode] = useState('');
  const apply = useCartMutation((c: string) => api.post<CartDto>('/buyer/cart/coupon', { code: c }));
  const removeCoupon = useCartMutation(() => api.delete<CartDto>('/buyer/cart/coupon'));

  if (status !== 'authed') {
    return (
      <Screen back={false} title={t('title')}>
        <EmptyState icon={<ShoppingCart size={32} color={colors.green[700]} />} title={tm('signInPrompt')} action={tm('signIn')} onAction={() => router.push('/login')} />
      </Screen>
    );
  }
  if (!isLoading && !cart?.groups.length) {
    return (
      <Screen back={false} title={t('title')}>
        <EmptyState icon={<ShoppingCart size={32} color={colors.green[700]} />} title={t('empty')} body={t('emptyBody')} action={t('startShopping')} onAction={() => router.push('/(tabs)')} />
      </Screen>
    );
  }
  return (
    <Screen
      back={false}
      title={t('title')}
      subtitle={cart ? t('itemsCount', { count: cart.itemsCount }) : undefined}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      footer={
        cart && (
          <View style={{ gap: 8 }}>
            {!cart.canCheckout && (
              <T size={12} center color={colors.amber[700]} weight="semibold">
                {cart.issues[0]?.message ?? t('fixIssues')}
              </T>
            )}
            <Button size="lg" title={`${t('checkout')} · ${f.money(cart.totals.grandTotal)}`} disabled={!cart.canCheckout} onPress={() => router.push('/checkout')} />
          </View>
        )
      }
    >
      {cart?.groups.length ? (
        <T size={12} color={colors.textMuted}>
          {t('splitNote', { count: cart.groups.length })}
        </T>
      ) : null}
      {cart?.groups.map((g) => (
        <Group key={g.supplier.id} g={g} />
      ))}
      {cart && (
        <Card pad={14} style={{ gap: 4 }}>
          {cart.coupon ? (
            <Row style={{ justifyContent: 'space-between', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.green[500], borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <Row>
                <Tag size={16} color={colors.green[700]} />
                <T num weight="extrabold" color={colors.green[800]}>
                  {cart.coupon.code}
                </T>
              </Row>
              <Pressable accessibilityLabel={t('removeCoupon')} onPress={() => removeCoupon.mutate(undefined)}>
                <X size={18} color={colors.gray[500]} />
              </Pressable>
            </Row>
          ) : (
            <Row style={{ marginBottom: 8 }}>
              <Input containerStyle={{ flex: 1 }} ltr autoCapitalize="characters" placeholder={t('couponPlaceholder')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} start={<Tag size={16} color={colors.gray[400]} />} />
              <Button title={t('applyCoupon')} variant="secondary" loading={apply.isPending} onPress={() => code && apply.mutate(code)} />
            </Row>
          )}
          <Totals totals={cart.totals} />
        </Card>
      )}
    </Screen>
  );
}
