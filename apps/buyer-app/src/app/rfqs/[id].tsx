import type { AcceptQuotationResult, AddressDto, QuotationSummaryDto, RfqDetailDto } from '@tawreed/contracts';
import { api, Badge, Button, Card, Chip, colors, deviceUrl, Divider, EmptyState, Input, KeyValue, Loading, OtpInput, Row, Screen, Sheet, StatusBadge, T, useErrorToast, useFormat, useToast } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Award, Hourglass, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';

function AcceptSheet({ q, open, onClose }: { q: QuotationSummaryDto; open: boolean; onClose: () => void }) {
  const t = useTranslations('account.rfqs');
  const tp = useTranslations('enums.PaymentMethod');
  const tco = useTranslations('checkout');
  const f = useFormat();
  const toast = useToast();
  const showError = useErrorToast();
  const { data: addresses = [] } = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<AddressDto[]>('/buyer/addresses'), enabled: open });
  const [method, setMethod] = useState(q.current.paymentMethods[0] ?? 'COD');
  const [addressId, setAddressId] = useState<string>();
  const [sent, setSent] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const address = addressId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id;
  const accept = async (code = otp) => {
    if (!address) return;
    setBusy(true);
    try {
      const r = await api.post<AcceptQuotationResult>(`/buyer/quotations/${q.id}/accept`, { versionId: q.current.id, otp: code, paymentMethod: method, addressId: address, termsAccepted: true });
      toast(t('accepted'));
      onClose();
      router.replace({ pathname: '/orders/[id]', params: { id: r.order.id, placed: '1' } });
    } catch (e) {
      setOtp('');
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('acceptTitle')}>
      <T color={colors.textMuted}>{t('acceptBody', { amount: f.money(q.current.total), supplier: q.supplier.name })}</T>
      <T weight="bold">{t('paymentTerms')}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {q.current.paymentMethods.map((m) => (
          <Chip key={m} label={tp(m)} active={method === m} onPress={() => setMethod(m)} />
        ))}
      </View>
      <T weight="bold">{tco('address')}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {addresses.map((a) => (
          <Chip key={a.id} label={a.label} active={address === a.id} onPress={() => setAddressId(a.id)} />
        ))}
      </View>
      {sent === null ? (
        <Button
          title={t('sendOtp')}
          loading={busy}
          disabled={!address}
          onPress={async () => {
            setBusy(true);
            try {
              const r = await api.post<{ devCode?: string }>(`/buyer/quotations/${q.id}/accept/otp`);
              setSent(r.devCode ?? '');
            } catch (e) {
              showError(e);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <>
          <OtpInput value={otp} onChange={setOtp} onComplete={(v) => void accept(v)} />
          {!!sent && (
            <T num center weight="bold" color={colors.amber[700]}>
              DEV · {sent}
            </T>
          )}
          <Button title={t('confirmAccept')} loading={busy} disabled={otp.length !== 6} onPress={() => void accept()} />
        </>
      )}
    </Sheet>
  );
}

function QuoteCard({ q, best, open }: { q: QuotationSummaryDto; best: boolean; open: boolean }) {
  const t = useTranslations('account.rfqs');
  const tc = useTranslations('common');
  const tp = useTranslations('enums.PaymentMethod');
  const f = useFormat();
  const showError = useErrorToast();
  const [accepting, setAccepting] = useState(false);
  const [revising, setRevising] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <Card pad={14} style={{ width: 290, gap: 8, borderColor: best ? colors.green[500] : colors.gray[100], borderWidth: best ? 1.5 : 1 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Image source={deviceUrl(q.supplier.logoUrl)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.gray[100] }} />
          <T weight="extrabold" numberOfLines={1} style={{ maxWidth: 150 }}>
            {q.supplier.name}
          </T>
        </Row>
        <StatusBadge kind="QuotationStatus" value={q.status} />
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        {q.isLowest && <Badge tone="brand" icon={<Award size={12} color={colors.green[800]} />} label={t('best')} />}
        {q.isFastest && <Badge tone="navy" icon={<Zap size={12} color={colors.navy[800]} />} label={t('leadTime')} />}
        <Badge label={t('version', { v: q.current.version })} />
      </Row>
      <T num weight="black" size={24} color={colors.navy[900]}>
        {f.money(q.current.total)}
      </T>
      {q.current.items.map((it) => (
        <KeyValue key={it.id} k={it.description} v={f.money(it.unitPrice)} num />
      ))}
      <Divider dashed />
      <KeyValue k={t('deliveryFee')} v={f.money(q.current.deliveryFee)} num />
      <KeyValue k={t('leadTime')} v={tc('day', { count: q.current.leadTimeDays })} />
      <KeyValue k={t('validUntil')} v={f.date(q.current.validUntil)} num />
      <T size={12} color={colors.textMuted}>
        {q.current.paymentMethods.map((m) => tp(m)).join(' · ')}
      </T>
      {q.current.notes && (
        <T size={12} color={colors.gray[700]} style={{ backgroundColor: colors.sand[50], padding: 8, borderRadius: 8 }}>
          {q.current.notes}
        </T>
      )}
      {open && q.status === 'SUBMITTED' && (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Button title={t('accept')} onPress={() => setAccepting(true)} />
          <Row>
            <Button style={{ flex: 1 }} size="sm" variant="outline" title={t('requestRevision')} onPress={() => setRevising(true)} />
            <Button style={{ flex: 1 }} size="sm" variant="ghost" title={t('reject')} onPress={() => void api.post(`/buyer/quotations/${q.id}/reject`, { reason: 'Not selected' }).catch(showError)} />
          </Row>
        </View>
      )}
      <AcceptSheet q={q} open={accepting} onClose={() => setAccepting(false)} />
      <Sheet open={revising} onClose={() => setRevising(false)} title={t('requestRevision')} footer={<Button title={t('send')} disabled={msg.trim().length < 3} onPress={() => void api.post(`/buyer/quotations/${q.id}/request-revision`, { message: msg }).then(() => setRevising(false)).catch(showError)} />}>
        <Input label={t('revisionMessage')} value={msg} onChangeText={setMsg} multiline style={{ height: 100 }} />
      </Sheet>
    </Card>
  );
}

export default function RfqDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations('account.rfqs');
  const f = useFormat();
  const { data: r, refetch, isRefetching } = useQuery({ queryKey: ['rfq', id], queryFn: () => api.get<RfqDetailDto>(`/buyer/rfqs/${id}`) });
  if (!r) return <Loading />;
  const quotes = [...r.quotations].sort((a, b) => Number(a.current.total) - Number(b.current.total));
  const open = ['OPEN', 'QUOTED'].includes(r.status);
  return (
    <Screen title={r.title} subtitle={r.number} refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={13} color={colors.textMuted}>
          {f.pick(r.city.name)}
          {r.neededBy ? ` · ${t('neededBy', { date: f.date(r.neededBy) })}` : ''}
        </T>
        <StatusBadge kind="RfqStatus" value={r.status} />
      </Row>
      <Card pad={12}>
        <T weight="bold" style={{ marginBottom: 6 }}>
          {t('items')}
        </T>
        {r.items.map((i) => (
          <KeyValue key={i.id} k={i.name} v={`${f.qty(i.qty)} ${i.unitLabel}`} num />
        ))}
      </Card>
      <T weight="extrabold" size={16}>
        {t('compare')}
      </T>
      {quotes.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 6 }}>
          {quotes.map((q, i) => (
            <QuoteCard key={q.id} q={q} best={i === 0} open={open} />
          ))}
        </ScrollView>
      ) : (
        <EmptyState icon={<Hourglass size={30} color={colors.green[700]} />} title={t('noQuotes')} body={t('noQuotesBody', { count: r.invitationsCount })} />
      )}
    </Screen>
  );
}
