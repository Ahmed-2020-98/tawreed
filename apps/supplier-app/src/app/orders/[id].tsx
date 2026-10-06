import type { DriverDto, SupplierOrderDetailDto } from '@tawreed/contracts';
import { api, Badge, Button, Card, colors, deviceUrl, Divider, Input, KeyValue, Loading, radii, Row, Screen, Sheet, StatusBadge, Steps, T, useErrorToast, useFormat, useToast } from '@tawreed/mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Phone, Truck, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useTranslations } from 'use-intl';

const ROUTE: Record<string, string> = { accept: 'accept', start_preparing: 'start-preparing', mark_ready: 'ready' };

export default function SupplierOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations('supplier');
  const to = useTranslations('account.orders.detail');
  const tco = useTranslations('checkout');
  const tpm = useTranslations('enums.PaymentMethod');
  const tcart = useTranslations('cart');
  const f = useFormat();
  const qc = useQueryClient();
  const toast = useToast();
  const showError = useErrorToast();
  const { data: o, refetch } = useQuery({ queryKey: ['supplier', 'order', id], queryFn: () => api.get<SupplierOrderDetailDto>(`/supplier/orders/${id}`) });
  const drivers = useQuery({ queryKey: ['supplier', 'drivers'], queryFn: () => api.get<DriverDto[]>('/supplier/drivers') });
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'reject' | 'ship' | null>(null);
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'SUPPLIER_FLEET' | 'PLATFORM_FLEET'>('SUPPLIER_FLEET');
  const [driverId, setDriverId] = useState<string>();
  if (!o) return <Loading />;

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      await refetch();
      void qc.invalidateQueries({ queryKey: ['supplier'] });
      return true;
    } catch (e) {
      showError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const next = o.allowedActions.find((a) => ROUTE[a]);
  const canShip = o.status === 'READY' && !o.shipments.some((s) => !['FAILED', 'CANCELLED'].includes(s.status));
  const stepLabel = (s: string) => (to.has(`progressSteps.${s}` as never) ? to(`progressSteps.${s}` as never) : s);
  const actionLabel = (a: string) => t(`actions.${a === 'start_preparing' ? 'start-preparing' : a === 'mark_ready' ? 'ready' : a}` as never);

  return (
    <Screen
      title={o.number}
      subtitle={o.order.number}
      right={<StatusBadge kind="SupplierOrderStatus" value={o.status} />}
      footer={
        (next || canShip || o.allowedActions.includes('reject')) && (
          <View style={{ gap: 8 }}>
            {next && <Button size="lg" title={actionLabel(next)} loading={busy} style={{ backgroundColor: colors.navy[900] }} onPress={() => void run(() => api.post(`/supplier/orders/${o.id}/${ROUTE[next]}`))} />}
            {canShip && <Button size="lg" title={t('actions.ship')} icon={<Truck size={20} color="#fff" />} onPress={() => setSheet('ship')} style={{ backgroundColor: colors.navy[900] }} />}
            {o.allowedActions.includes('reject') && <Button variant="ghost" title={t('actions.reject')} onPress={() => setSheet('reject')} />}
          </View>
        )
      }
    >
      {o.progress.steps.length > 1 && <Steps current={o.progress.step >= o.progress.steps.length - 1 ? o.progress.steps.length : o.progress.step} steps={o.progress.steps.map(stepLabel)} />}
      <Card pad={14} style={{ gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <UserRound size={18} color={colors.navy[900]} />
            <T weight="extrabold">{o.buyer.name}</T>
            {o.buyer.verificationStatus === 'VERIFIED' && <Badge tone="brand" label="✓" />}
          </Row>
          {o.buyer.phone && (
            <Pressable accessibilityLabel="call" onPress={() => void Linking.openURL(`tel:${o.buyer.phone}`)}>
              <Phone size={18} color={colors.navy[900]} />
            </Pressable>
          )}
        </Row>
        <T size={13} color={colors.textMuted}>
          {o.address.formatted}
        </T>
        <KeyValue k={t('deliveryDate')} v={`${f.date(o.deliveryDate)}${o.deliveryWindow ? ` · ${tco(`window.${o.deliveryWindow}`)}` : ''}`} />
        <KeyValue k={tco('payment')} v={tpm(o.order.paymentMethod)} />
        {o.acceptDeadlineAt && o.status === 'PENDING' && <KeyValue k="⏱" v={t('acceptBy', { time: f.dateTime(o.acceptDeadlineAt) })} />}
      </Card>
      <Card pad={14}>
        <T weight="extrabold" style={{ marginBottom: 6 }}>
          {t('items')}
        </T>
        {o.items.map((i) => (
          <Row key={i.id} style={{ paddingVertical: 6 }}>
            <Image source={deviceUrl(i.image)} style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: colors.gray[100] }} />
            <View style={{ flex: 1 }}>
              <T weight="bold" size={13} numberOfLines={1}>
                {i.name}
              </T>
              <T num size={12} color={colors.textMuted}>
                {f.qty(i.qty)} × {i.unitName} · {f.money(i.unitPrice)}
              </T>
            </View>
            <T num weight="extrabold" size={13}>
              {f.money(i.lineTotal)}
            </T>
          </Row>
        ))}
        <Divider dashed />
        <KeyValue k={tcart('grandTotal')} v={f.money(o.total)} num strong />
        <KeyValue k={t('commission')} v={`− ${f.money(o.commissionAmount)}`} num />
        <KeyValue k={t('net')} v={f.money(o.netAmount)} num strong />
      </Card>
      {o.shipments.map((s) => (
        <Card key={s.id} pad={14}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T num weight="bold">
              {s.number}
            </T>
            <StatusBadge kind="ShipmentStatus" value={s.status} />
          </Row>
          {s.driver && (
            <T size={13} color={colors.textMuted}>
              {s.driver.name} {s.driver.vehicle ? `· ${s.driver.vehicle.plateNumber}` : ''}
            </T>
          )}
        </Card>
      ))}

      <Sheet open={sheet === 'reject'} onClose={() => setSheet(null)} title={t('actions.reject')} footer={<Button variant="danger" title={t('actions.reject')} loading={busy} disabled={reason.trim().length < 3} onPress={() => void run(() => api.post(`/supplier/orders/${o.id}/reject`, { reason })).then((ok) => ok && setSheet(null))} />}>
        <Input label={t('rejectReason')} value={reason} onChangeText={setReason} multiline style={{ height: 90 }} />
      </Sheet>
      <Sheet
        open={sheet === 'ship'}
        onClose={() => setSheet(null)}
        title={t('shipTitle')}
        footer={
          <Button
            title={t('createShipment')}
            loading={busy}
            disabled={mode === 'SUPPLIER_FLEET' && !driverId}
            onPress={() => void run(() => api.post(`/supplier/orders/${o.id}/shipments`, mode === 'SUPPLIER_FLEET' ? { dispatchMode: mode, driverId } : { dispatchMode: mode }), t('shipmentCreated')).then((ok) => ok && setSheet(null))}
          />
        }
      >
        {(['SUPPLIER_FLEET', 'PLATFORM_FLEET'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={{ padding: 14, borderRadius: radii.xl, borderWidth: 1.5, borderColor: mode === m ? colors.navy[900] : colors.gray[200], backgroundColor: mode === m ? colors.navy[50] : '#fff' }}>
            <T weight="bold">{m === 'SUPPLIER_FLEET' ? t('ownDriver') : t('platformDriver')}</T>
          </Pressable>
        ))}
        {mode === 'SUPPLIER_FLEET' && (
          <>
            <T weight="bold">{t('chooseDriver')}</T>
            {(drivers.data ?? []).map((d) => (
              <Pressable key={d.id} onPress={() => setDriverId(d.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.lg, borderWidth: 1.5, borderColor: driverId === d.id ? colors.green[600] : colors.gray[100], backgroundColor: '#fff' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.isOnline ? colors.green[500] : colors.gray[300] }} />
                <View style={{ flex: 1 }}>
                  <T weight="bold">{d.name}</T>
                  <T size={12} color={colors.textMuted}>
                    {d.vehicle ? `${d.vehicle.plateNumber} · ` : ''}
                    {d.isOnline ? t('onlineNow') : t('offlineNow')}
                  </T>
                </View>
              </Pressable>
            ))}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
