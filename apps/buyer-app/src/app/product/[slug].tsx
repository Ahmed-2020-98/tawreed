import type { OfferSummaryDto, ProductDetailDto } from '@tawreed/contracts';
import { api, Badge, Button, Card, colors, deviceUrl, Divider, KeyValue, Loading, QuantityStepper, radii, Row, Segmented, T, unitPriceFor, useFormat, useRTL } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, FileText, Heart, Share2, ShoppingCart, Star, Truck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { useAddToCart } from '@/lib/cart';
import { flag } from '@/lib/country';

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTranslations('product');
  const ts = useTranslations('store');
  const tc = useTranslations('common');
  const f = useFormat();
  const rtl = useRTL();
  const insets = useSafeAreaInsets();
  const { add, isPending } = useAddToCart();
  const { data: p } = useQuery({ queryKey: ['product', slug], queryFn: () => api.get<ProductDetailDto>(`/public/products/${slug}`) });
  const [img, setImg] = useState(0);
  const [unitId, setUnitId] = useState<string>();
  const [offerId, setOfferId] = useState<string>();
  const [qty, setQty] = useState<number>();

  const units = useMemo(() => (p ? p.units.filter((u) => p.offers.some((o) => o.unit.id === u.id)) : []), [p]);
  if (!p) return <Loading />;
  const initial = p.bestOffer ?? p.offers[0];
  const uId = unitId ?? initial?.unit.id;
  const unitOffers = p.offers.filter((o) => o.unit.id === uId).sort((a, b) => Number(b.coversCity) - Number(a.coversCity) || Number(a.effectivePrice) - Number(b.effectivePrice));
  const offer: OfferSummaryDto | undefined = unitOffers.find((o) => o.id === offerId) ?? unitOffers[0];
  const q = Math.max(qty ?? Number(offer?.minOrderQty ?? 1), Number(offer?.minOrderQty ?? 1));
  const price = offer ? unitPriceFor(offer, q) : null;
  const images = p.images.length ? p.images : p.image ? [p.image] : [];
  const Back = rtl ? ChevronRight : ChevronLeft;

  const pickUnit = (id: string) => {
    setUnitId(id);
    setOfferId(undefined);
    setQty(undefined);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: 360, backgroundColor: colors.gray[200] }}>
          {images[img] && <Image source={deviceUrl(images[img].url)} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />}
          <Row style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, justifyContent: 'space-between' }}>
            <Pressable accessibilityLabel="back" onPress={() => router.back()} style={round}>
              <Back size={22} color="#fff" />
            </Pressable>
            <Row>
              <Pressable accessibilityLabel={ts('favorite')} style={round}>
                <Heart size={20} color="#fff" fill={p.isFavorite ? '#fff' : 'transparent'} />
              </Pressable>
              <Pressable accessibilityLabel={tc('share')} onPress={() => void Share.share({ message: `${p.name} — https://tawreed.sa/product/${p.slug}` })} style={round}>
                <Share2 size={20} color="#fff" />
              </Pressable>
            </Row>
          </Row>
        </View>
        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }} style={{ marginTop: -44 }}>
            {images.map((im, i) => (
              <Pressable key={im.url} onPress={() => setImg(i)} style={{ width: 72, height: 72, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 2, borderColor: i === img ? colors.green[600] : '#fff' }}>
                <Image source={deviceUrl(im.thumbUrl ?? im.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <T weight="black" size={22} style={{ lineHeight: 32 }}>
              {p.name}
            </T>
            <T color={colors.textMuted}>
              {flag(p.originCountry)} {p.brand?.name}
            </T>
            <Row style={{ flexWrap: 'wrap' }}>
              {p.storageType !== 'AMBIENT' && <Badge tone="blue" label={ts(p.storageType === 'FROZEN' ? 'frozen' : 'chilled')} />}
              {offer?.stockStatus === 'IN_STOCK' && <Badge tone="brand" label={ts('inStock')} />}
              {p.offersCount > 1 && <Badge tone="gray" label={t('otherSuppliersCount', { count: p.offersCount })} />}
            </Row>
          </View>

          {offer && price ? (
            <>
              <View>
                <Row gap={6}>
                  <T num weight="black" size={30} color={colors.navy[900]}>
                    {f.money(price.price, { symbol: false })}
                  </T>
                  <T weight="bold" color={colors.textMuted}>
                    {f.locale === 'ar' ? 'ر.س' : 'SAR'} / {offer.unit.name}
                  </T>
                </Row>
                <T size={13} color={colors.textMuted}>
                  {t('moq', { qty: f.qty(offer.minOrderQty), unit: offer.unit.name })}
                </T>
              </View>

              {units.length > 1 && (
                <View style={{ gap: 8 }}>
                  <T weight="bold">{t('chooseUnit')}</T>
                  <Segmented value={uId!} onChange={pickUnit} options={units.map((u) => ({ value: u.id, label: u.name }))} />
                </View>
              )}

              <Row style={{ justifyContent: 'space-between' }}>
                <T weight="bold">{t('quantity')}</T>
                <QuantityStepper value={q} onChange={setQty} min={Number(offer.minOrderQty)} step={Number(offer.qtyStep)} max={offer.maxOrderQty ? Number(offer.maxOrderQty) : null} />
              </Row>
              <Card pad={14} style={{ backgroundColor: colors.gray[50] }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T color={colors.textMuted}>{t('total')}</T>
                  <T num weight="black" size={22} color={colors.green[800]}>
                    {f.money(price.price * q)}
                  </T>
                </Row>
                <T size={11} color={colors.textSubtle}>
                  {t('vatNote')}
                </T>
              </Card>

              {offer.tiers.length > 0 && (
                <Card pad={0}>
                  <T weight="bold" style={{ padding: 12, paddingBottom: 4 }}>
                    {t('tiers')}
                  </T>
                  {[{ minQty: offer.minOrderQty, price: offer.price }, ...offer.tiers].map((tier) => (
                    <Row key={tier.minQty} style={{ justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: colors.gray[100] }}>
                      <T num size={13}>
                        {t('tierRow', { qty: f.qty(tier.minQty), unit: offer.unit.name })}
                      </T>
                      <T num weight="bold" size={13}>
                        {f.money(tier.price)}
                      </T>
                    </Row>
                  ))}
                </Card>
              )}

              <Card pad={14}>
                <Row>
                  <View style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.gray[100] }}>{offer.supplier.logoUrl && <Image source={deviceUrl(offer.supplier.logoUrl)} style={{ width: '100%', height: '100%' }} />}</View>
                  <View style={{ flex: 1 }}>
                    <T size={12} color={colors.textMuted}>
                      {t('soldBy')}
                    </T>
                    <T weight="bold">{offer.supplier.name}</T>
                  </View>
                  <Row gap={3}>
                    <Star size={14} color={colors.amber[500]} fill={colors.amber[500]} />
                    <T num weight="bold" size={13}>
                      {offer.supplier.ratingAvg}
                    </T>
                  </Row>
                </Row>
                <Divider dashed />
                <Row>
                  <Truck size={18} color={colors.green[700]} />
                  <T size={13} style={{ flex: 1 }}>
                    {offer.coversCity ? `${t('delivery')} ${t('deliveryIn', { count: offer.leadTimeDays })}${offer.freeDeliveryThreshold ? ` · ${t('freeOver', { amount: f.money(offer.freeDeliveryThreshold) })}` : ''}` : t('notCovered')}
                  </T>
                </Row>
              </Card>

              {p.offers.length > 1 && (
                <View style={{ gap: 8 }}>
                  <T weight="extrabold" size={16}>
                    {t('otherSuppliers')}
                  </T>
                  {p.offers.map((o) => (
                    <Pressable key={o.id} onPress={() => { setUnitId(o.unit.id); setOfferId(o.id); setQty(undefined); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.lg, backgroundColor: '#fff', borderWidth: 1.5, borderColor: o.id === offer.id ? colors.green[600] : colors.gray[100] }}>
                      <View style={{ flex: 1 }}>
                        <T weight="bold" size={14}>
                          {o.supplier.name}
                        </T>
                        <T size={12} color={colors.textMuted}>
                          {o.unit.name} · {o.coversCity ? t('deliveryIn', { count: o.leadTimeDays }) : t('notCovered')}
                        </T>
                      </View>
                      <T num weight="extrabold" color={colors.navy[900]}>
                        {f.money(o.effectivePrice)}
                      </T>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Card>
              <T weight="bold" center>
                {t('noOffers')}
              </T>
              <T center color={colors.textMuted}>
                {t('noOffersBody')}
              </T>
            </Card>
          )}

          {p.specs.length > 0 && (
            <Card pad={14}>
              <T weight="extrabold" size={16} style={{ marginBottom: 6 }}>
                {t('tabs.specs')}
              </T>
              {p.specs.map((s) => (
                <KeyValue key={s.key} k={s.key} v={s.value} />
              ))}
            </Card>
          )}
          {p.description && (
            <Card pad={14}>
              <T weight="extrabold" size={16} style={{ marginBottom: 6 }}>
                {t('tabs.description')}
              </T>
              <T color={colors.gray[700]} style={{ lineHeight: 26 }}>
                {p.description}
              </T>
            </Card>
          )}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.gray[100] }}>
        <Button style={{ flex: 1 }} size="lg" title={ts('addToCart')} icon={<ShoppingCart size={20} color="#fff" />} loading={isPending} disabled={!offer || !offer.coversCity || offer.stockStatus === 'OUT_OF_STOCK'} onPress={() => offer && add(offer.id, q)} />
        <Button size="lg" variant="outline" icon={<FileText size={20} color={colors.navy[900]} />} onPress={() => router.push(`/rfq/new?product=${p.slug}${offer ? `&unit=${offer.unit.id}&qty=${q}` : ''}`)} accessibilityLabel={ts('requestQuote')} />
      </View>
    </View>
  );
}

const round = { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(5,26,56,0.4)', alignItems: 'center' as const, justifyContent: 'center' as const };
