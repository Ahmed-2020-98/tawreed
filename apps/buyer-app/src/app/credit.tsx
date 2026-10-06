import type { CreditLedgerEntryDto, CreditOverviewDto } from '@tawreed/contracts';
import { api, Badge, Button, Card, colors, EmptyState, KeyValue, Loading, Row, Screen, StatusBadge, T, useErrorToast, useFormat, useToast } from '@tawreed/mobile';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';
import { InvoiceRow } from '@/components/invoice-row';

export default function Credit() {
  const t = useTranslations('account.credit');
  const f = useFormat();
  const toast = useToast();
  const showError = useErrorToast();
  const [paying, setPaying] = useState(false);
  const { data: c, refetch, isRefetching } = useQuery({ queryKey: ['credit'], queryFn: () => api.get<CreditOverviewDto>('/buyer/credit') });
  const ledger = useQuery({ queryKey: ['credit', 'ledger'], queryFn: () => api.page<CreditLedgerEntryDto>('/buyer/credit/ledger', { query: { pageSize: 15 } }) });
  if (!c) return <Loading />;
  if (c.status === 'NO_CREDIT') {
    return (
      <Screen title={t('title')}>
        <EmptyState
          icon={<Wallet size={32} color={colors.green[700]} />}
          title={t('heroTitle')}
          body={t('heroBody')}
          action={c.pendingApplication ? undefined : t('apply')}
          onAction={async () => {
            await api.post('/buyer/credit/applications', { requestedLimit: '50000', requestedTermsDays: 30, documentFileIds: [] });
            toast(t('applicationSent'));
            void refetch();
          }}
        />
        {c.pendingApplication && <Badge tone="amber" label={t('pending')} style={{ alignSelf: 'center' }} />}
      </Screen>
    );
  }
  const pct = (Number(c.usedAmount) / Math.max(1, Number(c.creditLimit))) * 100;
  return (
    <Screen title={t('title')} right={<StatusBadge kind="CreditStatus" value={c.status} />} refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Card style={{ backgroundColor: colors.green[950], borderColor: colors.green[950], gap: 10 }}>
        <T color="rgba(255,255,255,0.65)" size={13}>
          {t('available')}
        </T>
        <T num weight="black" size={32} color="#fff">
          {f.money(c.availableAmount)}
        </T>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: colors.green[400] }} />
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <T num size={12} color="rgba(255,255,255,0.7)">
            {t('used')}: {f.money(c.usedAmount)}
          </T>
          <T num size={12} color="rgba(255,255,255,0.7)">
            {t('limit')}: {f.money(c.creditLimit)}
          </T>
        </Row>
      </Card>
      <Card pad={14}>
        <KeyValue k={t('terms')} v={t('termsValue', { count: c.termsDays })} />
        <KeyValue k={t('nextDue')} v={f.date(c.nextDueDate)} />
        <KeyValue k={t('dueSoon')} v={f.money(c.dueSoonAmount)} num />
        <KeyValue k={t('overdue')} v={f.money(c.overdueAmount)} num />
      </Card>
      {c.openInvoices.length > 0 && (
        <>
          <T weight="extrabold" size={16}>
            {t('openInvoices')}
          </T>
          {c.openInvoices.map((i) => (
            <InvoiceRow key={i.id} i={i} />
          ))}
          <Button
            title={t('payDues')}
            variant="secondary"
            loading={paying}
            onPress={async () => {
              setPaying(true);
              try {
                const returnUrl = Linking.createURL('/credit');
                const r = await api.post<{ paymentId: string; checkoutUrl: string }>('/buyer/payments/card', { purpose: 'CREDIT_REPAYMENT', invoiceIds: c.openInvoices.map((i) => i.id), returnUrl });
                await WebBrowser.openAuthSessionAsync(r.checkoutUrl, returnUrl);
                await api.get(`/buyer/payments/${r.paymentId}/verify`).catch(() => undefined);
                void refetch();
              } catch (e) {
                showError(e);
              } finally {
                setPaying(false);
              }
            }}
          />
        </>
      )}
      <T weight="extrabold" size={16}>
        {t('ledger')}
      </T>
      <Card pad={0}>
        {(ledger.data?.data ?? []).map((e) => (
          <Row key={e.id} style={{ justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: colors.gray[100] }}>
            <View style={{ flex: 1 }}>
              <T weight="semibold" size={13} numberOfLines={1}>
                {e.note ?? e.reference ?? e.type}
              </T>
              <T num size={11} color={colors.textMuted}>
                {f.dateTime(e.createdAt)}
              </T>
            </View>
            <T num weight="extrabold" color={Number(e.amount) < 0 ? colors.green[700] : colors.navy[900]}>
              {f.money(e.amount)}
            </T>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
