import type { PaymentMethod, RfqDetailDto } from '@tawreed/contracts';
import { api, Button, Card, Chip, colors, Divider, Input, KeyValue, Loading, Row, Screen, T, useErrorToast, useFormat, useToast } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

const METHODS: PaymentMethod[] = ['CREDIT', 'BANK_TRANSFER', 'COD', 'CARD'];

export default function QuoteBuilder() {
  const { rfqId } = useLocalSearchParams<{ rfqId: string }>();
  const t = useTranslations('supplier');
  const tp = useTranslations('enums.PaymentMethod');
  const f = useFormat();
  const toast = useToast();
  const showError = useErrorToast();
  const { data: r } = useQuery({ queryKey: ['supplier', 'rfq', rfqId], queryFn: () => api.get<RfqDetailDto>(`/supplier/rfqs/${rfqId}`) });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [fee, setFee] = useState('0');
  const [lead, setLead] = useState('3');
  const [valid, setValid] = useState('7');
  const [methods, setMethods] = useState<PaymentMethod[]>(['BANK_TRANSFER', 'COD']);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  if (!r) return <Loading />;
  const subtotal = r.items.reduce((s, i) => s + Number(prices[i.id] || 0) * Number(i.qty), 0);
  const total = (subtotal + Number(fee || 0)) * 1.15;
  const ready = r.items.every((i) => Number(prices[i.id]) > 0) && methods.length > 0;
  const submit = async () => {
    setBusy(true);
    try {
      const validUntil = new Date(Date.now() + Number(valid || 7) * 86_400_000).toISOString().slice(0, 10);
      await api.post(`/supplier/rfqs/${r.id}/quotations`, { items: r.items.map((i) => ({ rfqItemId: i.id, unitPrice: prices[i.id] })), deliveryFee: fee || '0', validUntil, leadTimeDays: Number(lead || 0), paymentMethods: methods, notes: notes || undefined });
      toast(t('quoteSent'));
      router.back();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={t('quoteBuilder')} subtitle={r.number} footer={<Button size="lg" title={`${t('submitQuote')} · ${f.money(total)}`} loading={busy} disabled={!ready} style={{ backgroundColor: colors.navy[900] }} onPress={() => void submit()} />}>
      <Card pad={14} style={{ gap: 4 }}>
        <T weight="extrabold" size={16}>
          {r.title}
        </T>
        <T size={12} color={colors.textMuted}>
          {f.pick(r.city.name)}
          {r.neededBy ? ` · ${f.date(r.neededBy)}` : ''}
        </T>
        {r.notes && (
          <T size={13} color={colors.gray[700]} style={{ marginTop: 6 }}>
            {r.notes}
          </T>
        )}
      </Card>
      {r.items.map((i) => (
        <Card key={i.id} pad={14} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T weight="bold" style={{ flex: 1 }}>
              {i.name}
            </T>
            <T num weight="bold" color={colors.navy[900]}>
              {f.qty(i.qty)} {i.unitLabel}
            </T>
          </Row>
          {i.targetUnitPrice && <KeyValue k={t('targetPrice')} v={f.money(i.targetUnitPrice)} num />}
          <Input label={t('unitPrice')} ltr keyboardType="decimal-pad" value={prices[i.id] ?? ''} onChangeText={(v) => setPrices((p) => ({ ...p, [i.id]: v.replace(/[^\d.]/g, '') }))} />
        </Card>
      ))}
      <Card pad={14} style={{ gap: 10 }}>
        <Row>
          <Input containerStyle={{ flex: 1 }} label={t('deliveryFee')} ltr keyboardType="decimal-pad" value={fee} onChangeText={setFee} />
          <Input containerStyle={{ flex: 1 }} label={t('leadDays')} ltr keyboardType="number-pad" value={lead} onChangeText={setLead} />
          <Input containerStyle={{ flex: 1 }} label={t('validDays')} ltr keyboardType="number-pad" value={valid} onChangeText={setValid} />
        </Row>
        <T weight="bold">{t('paymentMethods')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {METHODS.map((m) => (
            <Chip key={m} label={tp(m)} active={methods.includes(m)} onPress={() => setMethods((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))} />
          ))}
        </View>
        <Input label={t('notes')} value={notes} onChangeText={setNotes} multiline style={{ height: 80 }} />
        <Divider dashed />
        <KeyValue k={t('total')} v={f.money(total)} num strong />
      </Card>
    </Screen>
  );
}
