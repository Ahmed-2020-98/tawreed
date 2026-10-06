import type { OrderDetailDto, SupplierOrderDto } from '@tawreed/contracts';
import { api, Badge, Button, Card, colors, deviceUrl, Divider, Input, KeyValue, Loading, radii, Row, Screen, Sheet, StatusBadge, Steps, T, useErrorToast, useFormat, useRealtime, useToast } from '@tawreed/mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CheckCircle2, ClipboardList, FileText, Image as ImageIcon, Phone, Receipt, Star, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { TrackingMap } from '@/components/tracking-map';

function Rate({ so, onDone }: { so: SupplierOrderDto; onDone: () => void }) {
  const t = useTranslations('account.orders.detail');
  const toast = useToast();
  const showError = useErrorToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  if (so.review)
    return (
      <Row gap={2}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={14} color={colors.amber[500]} fill={i < so.review!.rating ? colors.amber[500] : 'transparent'} />
        ))}
      </Row>
    );
  if (!so.allowedActions.includes('rate')) return null;
  return (
    <>
      <Button size="sm" variant="soft" title={t('rate')} icon={<Star size={15} color={colors.green[800]} />} onPress={() => setOpen(true)} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('rateTitle', { name: so.supplier.name })}
        footer={
          <Button
            title={t('submit')}
            onPress={async () => {
              try {
                await api.post(`/buyer/orders/supplier-orders/${so.id}/review`, { rating, comment: comment || undefined });
                toast(t('thanks'));
                setOpen(false);
                onDone();
              } catch (e) {
                showError(e);
              }
            }}
          />
        }
      >
        <Row style={{ justifyContent: 'center', direction: 'ltr' }} gap={10}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} accessibilityLabel={`${n}`}>
              <Star size={40} color={colors.amber[500]} fill={n <= rating ? colors.amber[500] : 'transparent'} />
            </Pressable>
          ))}
        </Row>
        <Input label={t('comment')} value={comment} onChangeText={setComment} multiline style={{ height: 90 }} />
      </Sheet>
    </>
  );
}

function SupplierOrderCard({ so, onChange }: { so: SupplierOrderDto; onChange: () => void }) {
  const t = useTranslations('account.orders.detail');
  const tm = useTranslations('mobile');
  const f = useFormat();
  const live = so.shipments.find((s) => s.trackable) ?? so.shipments[0];
  const stepLabel = (s: string) => (t.has(`progressSteps.${s}` as never) ? t(`progressSteps.${s}` as never) : s);
  return (
    <Card pad={14} style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Image source={deviceUrl(so.supplier.logoUrl)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.gray[100] }} />
          <View>
            <T weight="extrabold">{so.supplier.name}</T>
            <T num size={11} color={colors.textMuted}>
              {so.number}
            </T>
          </View>
        </Row>
        <StatusBadge kind="SupplierOrderStatus" value={so.status} />
      </Row>
      {so.progress.steps.length > 1 && <Steps current={so.progress.step >= so.progress.steps.length - 1 ? so.progress.steps.length : so.progress.step} steps={so.progress.steps.map(stepLabel)} />}
      {live?.trackable && <TrackingMap shipmentId={live.id} />}
      {live?.driver && (
        <View style={{ gap: 4 }}>
          <T weight="extrabold">{tm('shipmentInfo')}</T>
          <KeyValue k={tm('shipmentNo')} v={live.number} num />
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green[50], alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={20} color={colors.green[700]} />
              </View>
              <View>
                <T size={12} color={colors.textMuted}>
                  {tm('driverName')}
                </T>
                <T weight="bold">
                  {live.driver.name} {live.driver.vehicle && <T num size={12} color={colors.textMuted}>· {live.driver.vehicle.plateNumber}</T>}
                </T>
              </View>
            </Row>
            {live.driver.phone && (
              <Pressable accessibilityLabel={t('call')} onPress={() => void Linking.openURL(`tel:${live.driver!.phone}`)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navy[900], alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={18} color="#fff" />
              </Pressable>
            )}
          </Row>
          {live.etaAt && <KeyValue k={tm('eta')} v={f.dateTime(live.etaAt)} />}
        </View>
      )}
      <Divider />
      {so.items.map((i) => (
        <Row key={i.id}>
          <Image source={deviceUrl(i.image)} style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.gray[100] }} />
          <View style={{ flex: 1 }}>
            <T weight="bold" size={13} numberOfLines={1}>
              {i.name}
            </T>
            <T num size={12} color={colors.textMuted}>
              {f.qty(i.qty)} × {i.unitName}
            </T>
          </View>
          <T num weight="extrabold" size={13}>
            {f.money(i.lineTotal)}
          </T>
        </Row>
      ))}
      <Row style={{ justifyContent: 'space-between' }}>
        <T num weight="black" color={colors.navy[900]}>
          {f.money(so.total)}
        </T>
        <Rate so={so} onDone={onChange} />
      </Row>
    </Card>
  );
}

export default function OrderDetail() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const t = useTranslations('account.orders.detail');
  const tm = useTranslations('mobile');
  const tco = useTranslations('checkout');
  const tpm = useTranslations('enums.PaymentMethod');
  const tcart = useTranslations('cart');
  const f = useFormat();
  const qc = useQueryClient();
  const toast = useToast();
  const showError = useErrorToast();
  const { data: o, refetch, isRefetching } = useQuery({ queryKey: ['order', id], queryFn: () => api.get<OrderDetailDto>(`/buyer/orders/${id}`) });
  useRealtime({ 'shipment.updated': () => void refetch(), 'order.updated': () => void refetch(), poll: () => void refetch() });
  const [proofBusy, setProofBusy] = useState(false);
  if (!o) return <Loading />;

  const invoice = o.supplierOrders.find((s) => s.invoice)?.invoice;
  const openInvoice = async (invoiceId: string) => {
    try {
      const r = await api.get<{ url: string }>(`/buyer/invoices/${invoiceId}/pdf`);
      await WebBrowser.openBrowserAsync(deviceUrl(r.url));
    } catch (e) {
      showError(e);
    }
  };
  const docs = [
    { icon: ClipboardList, label: tm('documents.po'), doc: o.documents.find((d) => d.type === 'PURCHASE_ORDER') },
    { icon: Receipt, label: tm('documents.invoice'), invoice },
    { icon: FileText, label: tm('documents.delivery'), doc: o.documents.find((d) => d.type === 'DELIVERY_NOTE') },
    { icon: ImageIcon, label: tm('documents.photos') },
  ];
  const uploadProof = async () => {
    const pick = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (pick.canceled || !pick.assets[0]) return;
    setProofBusy(true);
    try {
      const a = pick.assets[0];
      const fd = new FormData();
      fd.append('file', { uri: a.uri, name: a.fileName ?? 'receipt.jpg', type: a.mimeType ?? 'image/jpeg' } as unknown as Blob);
      fd.append('purpose', 'PAYMENT_PROOF');
      const file = await api.post<{ id: string }>('/files', fd);
      await api.post('/buyer/payments/bank-transfer', { purpose: 'ORDER', orderId: o.id, amount: o.grandTotal, bankReference: `APP-${Date.now().toString().slice(-8)}`, transferDate: new Date().toISOString().slice(0, 10), proofFileId: file.id });
      toast(t('proofSent'));
      void refetch();
    } catch (e) {
      showError(e);
    } finally {
      setProofBusy(false);
    }
  };

  return (
    <Screen title={tm('trackOrder')} subtitle={o.number} refreshing={isRefetching} onRefresh={() => void refetch()}>
      {placed && (
        <Card pad={14} style={{ backgroundColor: colors.green[700], borderColor: colors.green[700] }}>
          <Row>
            <CheckCircle2 size={28} color="#fff" />
            <View style={{ flex: 1 }}>
              <T weight="black" color="#fff" size={16}>
                {tco('successTitle')}
              </T>
              <T color="rgba(255,255,255,0.85)" size={12}>
                {tco('successBody', { number: o.number })}
              </T>
            </View>
          </Row>
        </Card>
      )}
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={13} color={colors.textMuted}>
          {t('placedAt', { date: f.dateTime(o.placedAt ?? o.createdAt) })}
        </T>
        <StatusBadge kind="OrderStatus" value={o.status} />
      </Row>
      {o.status === 'PENDING_PAYMENT' && o.paymentMethod === 'BANK_TRANSFER' && (
        <Card pad={14} style={{ backgroundColor: colors.amber[50], borderColor: colors.amber[100], gap: 8 }}>
          <T weight="extrabold" color={colors.amber[700]}>
            {t('bankPending')}
          </T>
          {o.payments.some((p) => p.status === 'PENDING_VERIFICATION') ? <Badge tone="blue" label={t('proofSent')} /> : <Button title={t('bankUpload')} variant="secondary" loading={proofBusy} onPress={() => void uploadProof()} />}
        </Card>
      )}
      {o.supplierOrders.map((so) => (
        <SupplierOrderCard key={so.id} so={so} onChange={() => void qc.invalidateQueries({ queryKey: ['order', id] })} />
      ))}
      <T weight="extrabold" size={16}>
        {t('documents')}
      </T>
      <Row>
        {docs.map((d) => {
          const enabled = !!(d.doc || d.invoice);
          return (
            <Pressable
              key={d.label}
              disabled={!enabled}
              onPress={() => (d.invoice ? void openInvoice(d.invoice.id) : d.doc ? void WebBrowser.openBrowserAsync(d.doc.url) : undefined)}
              style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radii.lg, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray[100], opacity: enabled ? 1 : 0.45 }}
            >
              <d.icon size={22} color={colors.navy[900]} />
              <T size={11} weight="semibold" center>
                {d.label}
              </T>
            </Pressable>
          );
        })}
      </Row>
      <Card pad={14}>
        <KeyValue k={t('address')} v={o.address.label} />
        <T size={12} color={colors.textMuted}>
          {o.address.formatted}
        </T>
        <Divider dashed />
        <KeyValue k={t('payment')} v={tpm(o.paymentMethod)} />
        <KeyValue k={t('paid')} v={f.money(o.amountPaid)} num />
        <KeyValue k={tcart('grandTotal')} v={f.money(o.grandTotal)} strong num />
      </Card>
    </Screen>
  );
}
