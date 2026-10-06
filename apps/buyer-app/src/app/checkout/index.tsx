import type { CheckoutOptionsDto, DeliveryWindow, PaymentMethod, PaymentVerifyResult, PlaceOrderResult } from '@tawreed/contracts';
import { api, Button, Card, colors, deviceUrl, Input, Loading, radii, Row, Screen, Steps, T, useErrorToast, useFormat } from '@tawreed/mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Banknote, Building2, CreditCard, MapPin, Package, Snowflake, Thermometer, Truck, Wallet } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { Totals } from '@/components/totals';

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = { CARD: CreditCard, BANK_TRANSFER: Building2, COD: Banknote, CREDIT: Wallet };

export default function Checkout() {
  const t = useTranslations('checkout');
  const tm = useTranslations('mobile');
  const f = useFormat();
  const qc = useQueryClient();
  const showError = useErrorToast();
  const [addressId, setAddressId] = useState<string>();
  const { data: o } = useQuery({ queryKey: ['checkout-options', addressId ?? null], queryFn: () => api.get<CheckoutOptionsDto>('/buyer/checkout/options', { query: { addressId } }), placeholderData: (p) => p });
  const [picked, setPicked] = useState<Record<string, { date: string; window: DeliveryWindow }>>({});
  const [pickedMethod, setMethod] = useState<PaymentMethod>();
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  // One idempotency key per checkout attempt, created on first submit (not during render).
  const idem = useRef<string | null>(null);
  if (!o) return <Loading />;

  const address = o.addresses.find((a) => a.id === (addressId ?? o.selectedAddressId));
  const slots: Record<string, { date: string; window: DeliveryWindow }> = {};
  for (const d of o.deliverySlots) {
    const cur = picked[d.supplierId];
    const first = d.slots[0];
    if (cur && d.slots.some((s) => s.date === cur.date)) slots[d.supplierId] = cur;
    else if (first) slots[d.supplierId] = { date: first.date, window: first.windows[0]! };
  }
  const method = pickedMethod && o.paymentMethods.find((m) => m.method === pickedMethod)?.available ? pickedMethod : o.paymentMethods.find((m) => m.available)?.method;
  const storage = new Set(o.cart.groups.map((g) => g.storageType));
  const step = !address ? 1 : !method ? 2 : 3;

  const place = async () => {
    if (!address || !method) return;
    setPlacing(true);
    try {
      const returnUrl = Linking.createURL('/checkout/result');
      const r = await api.post<PlaceOrderResult>(
        '/buyer/checkout/place',
        { addressId: address.id, paymentMethod: method, deliveries: o.deliverySlots.map((d) => ({ supplierId: d.supplierId, ...slots[d.supplierId]! })), notes: notes || undefined, expectedTotal: o.cart.totals.grandTotal, returnUrl },
        { headers: { 'idempotency-key': (idem.current ??= `app-${Date.now()}-${Math.random().toString(36).slice(2)}`) } },
      );
      qc.setQueryData(['cart', 'count'], 0);
      void qc.invalidateQueries({ queryKey: ['cart'] });
      if (r.payment.checkoutUrl) {
        const res = await WebBrowser.openAuthSessionAsync(r.payment.checkoutUrl, returnUrl);
        const paymentId = res.type === 'success' ? Linking.parse(res.url).queryParams?.payment : undefined;
        if (typeof paymentId === 'string') await api.get<PaymentVerifyResult>(`/buyer/payments/${paymentId}/verify`).catch(() => undefined);
      }
      router.replace({ pathname: '/orders/[id]', params: { id: r.order.id, placed: '1' } });
    } catch (e) {
      showError(e);
      void qc.invalidateQueries({ queryKey: ['checkout-options'] });
      setPlacing(false);
    }
  };

  return (
    <Screen
      title={t('title')}
      footer={<Button size="lg" title={`${t('place')} · ${f.money(o.cart.totals.grandTotal)}`} loading={placing} disabled={!address || !method || !o.cart.canCheckout} onPress={() => void place()} />}
    >
      <Steps current={step} steps={[tm('checkoutSteps.products'), tm('checkoutSteps.delivery'), tm('checkoutSteps.payment'), tm('checkoutSteps.review')]} icons={[<Package key="p" size={16} color={colors.green[700]} />, <MapPin key="m" size={16} color={colors.gray[400]} />, <CreditCard key="c" size={16} color={colors.gray[400]} />, <Wallet key="w" size={16} color={colors.gray[400]} />]} />

      <Card pad={12}>
        {o.cart.groups.flatMap((g) => g.items).slice(0, 4).map((i) => (
          <Row key={i.id} style={{ paddingVertical: 6 }}>
            <Image source={deviceUrl(i.product.image?.thumbUrl)} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.gray[100] }} />
            <View style={{ flex: 1 }}>
              <T weight="bold" size={13} numberOfLines={1}>
                {i.product.name}
              </T>
              <T num size={12} color={colors.textMuted}>
                {f.qty(i.qty)} × {i.unit.name}
              </T>
            </View>
            <T num weight="extrabold" size={13}>
              {f.money(i.lineTotal)}
            </T>
          </Row>
        ))}
      </Card>

      <T weight="extrabold" size={16}>
        {t('address')}
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {o.addresses.map((a) => {
          const on = a.id === address?.id;
          return (
            <Pressable key={a.id} onPress={() => setAddressId(a.id)} style={{ width: 260, padding: 14, borderRadius: radii.xl, backgroundColor: '#fff', borderWidth: 1.5, borderColor: on ? colors.green[600] : colors.gray[100], gap: 4 }}>
              <Row>
                <MapPin size={16} color={on ? colors.green[700] : colors.gray[400]} />
                <T weight="bold">{a.label}</T>
              </Row>
              <T size={12} color={colors.textMuted} numberOfLines={2}>
                {a.formatted}
              </T>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push('/addresses')} style={{ width: 140, padding: 14, borderRadius: radii.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gray[300], alignItems: 'center', justifyContent: 'center' }}>
          <T weight="bold" color={colors.green[700]} center>
            {t('addAddress')}
          </T>
        </Pressable>
      </ScrollView>

      <T weight="extrabold" size={16}>
        {tm('transportType')}
      </T>
      <Row>
        {(['AMBIENT', 'CHILLED', 'FROZEN'] as const).map((s) => {
          const on = storage.has(s);
          const Icon = s === 'AMBIENT' ? Truck : s === 'CHILLED' ? Thermometer : Snowflake;
          return (
            <View key={s} style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: radii.xl, backgroundColor: '#fff', borderWidth: 1.5, borderColor: on ? colors.green[600] : colors.gray[100], opacity: on ? 1 : 0.5 }}>
              <Icon size={22} color={on ? colors.green[700] : colors.gray[400]} />
              <T size={12} weight="bold" color={on ? colors.green[800] : colors.gray[500]}>
                {tm(`transport.${s}`)}
              </T>
            </View>
          );
        })}
      </Row>

      <T weight="extrabold" size={16}>
        {t('schedule')}
      </T>
      {o.deliverySlots.map((d) => {
        const cur = slots[d.supplierId];
        const day = d.slots.find((s) => s.date === cur?.date);
        return (
          <Card key={d.supplierId} pad={12} style={{ gap: 10 }}>
            <T weight="bold">{d.supplierName}</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {d.slots.slice(0, 7).map((s) => {
                const dt = new Date(`${s.date}T12:00:00`);
                const on = s.date === cur?.date;
                return (
                  <Pressable key={s.date} onPress={() => setPicked((p) => ({ ...p, [d.supplierId]: { date: s.date, window: s.windows[0]! } }))} style={{ width: 58, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: on ? colors.green[700] : '#fff', borderWidth: 1, borderColor: on ? colors.green[700] : colors.gray[200] }}>
                    <T size={10} weight="semibold" color={on ? '#fff' : colors.gray[500]}>
                      {dt.toLocaleDateString(f.locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-US', { weekday: 'short' })}
                    </T>
                    <T num weight="black" size={17} color={on ? '#fff' : colors.text}>
                      {dt.getDate()}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Row style={{ flexWrap: 'wrap' }}>
              {day?.windows.map((w) => (
                <Pressable key={w} onPress={() => setPicked((p) => ({ ...p, [d.supplierId]: { date: cur!.date, window: w } }))} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: cur?.window === w ? colors.green[600] : colors.gray[200], backgroundColor: cur?.window === w ? colors.green[50] : '#fff' }}>
                  <T size={12} weight="semibold" color={cur?.window === w ? colors.green[800] : colors.gray[600]}>
                    {t(`window.${w}`)}
                  </T>
                </Pressable>
              ))}
            </Row>
          </Card>
        );
      })}

      <T weight="extrabold" size={16}>
        {t('payment')}
      </T>
      {o.paymentMethods.map((m) => {
        const Icon = METHOD_ICON[m.method];
        const on = m.method === method;
        return (
          <Pressable key={m.method} disabled={!m.available} onPress={() => setMethod(m.method)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.xl, backgroundColor: on ? colors.green[50] : '#fff', borderWidth: 1.5, borderColor: on ? colors.green[600] : colors.gray[100], opacity: m.available ? 1 : 0.5 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? colors.green[700] : colors.gray[300], alignItems: 'center', justifyContent: 'center' }}>{on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green[700] }} />}</View>
            <View style={{ flex: 1 }}>
              <T weight="bold">{t(`methods.${m.method}`)}</T>
              <T num size={12} color={colors.textMuted}>
                {m.available ? (m.method === 'CREDIT' && m.credit ? t('methodHints.CREDIT', { available: f.money(m.credit.available), days: m.credit.termsDays }) : t(`methodHints.${m.method}`)) : m.reason}
              </T>
            </View>
            <Icon size={22} color={colors.gray[400]} />
          </Pressable>
        );
      })}

      <Input label={t('notes')} placeholder={t('notesPlaceholder')} value={notes} onChangeText={setNotes} />

      <Card pad={14}>
        <Totals totals={o.cart.totals} />
      </Card>
    </Screen>
  );
}
