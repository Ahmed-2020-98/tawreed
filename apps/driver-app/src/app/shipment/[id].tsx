import type { ShipmentDetailDto } from '@tawreed/contracts';
import { api, Button, Card, Chip, colors, deviceUrl, Divider, Input, KeyValue, Loading, MapFallback, nativeMapsAvailable, OtpInput, QuantityStepper, radii, Row, Screen, Sheet, StatusBadge, T, useErrorToast, useFormat, useToast } from '@tawreed/mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Banknote, Camera, MapPin, Navigation, Phone, Store, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTranslations } from 'use-intl';
import { SignaturePad, type SignaturePadHandle } from '@/components/signature-pad';
import { uploadUri } from '@/lib/upload';

const REASONS = ['CUSTOMER_UNAVAILABLE', 'ADDRESS_NOT_FOUND', 'REFUSED', 'DAMAGED', 'VEHICLE_ISSUE', 'OTHER'] as const;

async function here(): Promise<{ lat?: number; lng?: number }> {
  try {
    const p = await Location.getLastKnownPositionAsync();
    return p ? { lat: p.coords.latitude, lng: p.coords.longitude } : {};
  } catch {
    return {};
  }
}

function openMaps(lat: number, lng: number, label: string) {
  const url = Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(label)}` : `google.navigation:q=${lat},${lng}`;
  void Linking.openURL(url);
}

function Photos({ uris, onAdd, onRemove, label }: { uris: string[]; onAdd: () => void; onRemove: (i: number) => void; label: string }) {
  return (
    <Row style={{ flexWrap: 'wrap' }}>
      {uris.map((u, i) => (
        <View key={u}>
          <Image source={u} style={{ width: 72, height: 72, borderRadius: radii.lg }} />
          <Pressable accessibilityLabel="remove" onPress={() => onRemove(i)} style={{ position: 'absolute', top: -6, end: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.red[600], alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#fff" />
          </Pressable>
        </View>
      ))}
      {uris.length < 6 && (
        <Pressable onPress={onAdd} style={{ width: 72, height: 72, borderRadius: radii.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gray[300], alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Camera size={20} color={colors.gray[500]} />
          <T size={10} color={colors.gray[500]}>
            {label}
          </T>
        </Pressable>
      )}
    </Row>
  );
}

async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  const res = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.6 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  return res.canceled ? null : (res.assets[0]?.uri ?? null);
}

export default function ShipmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations('driver');
  const f = useFormat();
  const qc = useQueryClient();
  const toast = useToast();
  const showError = useErrorToast();
  const { data: s, refetch } = useQuery({ queryKey: ['driver', 'shipment', id], queryFn: () => api.get<ShipmentDetailDto>(`/driver/shipments/${id}`) });
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'pickup' | 'deliver' | 'fail' | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [receiver, setReceiver] = useState('');
  const [otp, setOtp] = useState('');
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [cod, setCod] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('CUSTOMER_UNAVAILABLE');
  const [note, setNote] = useState('');
  const sig = useRef<SignaturePadHandle>(null);
  if (!s) return <Loading />;

  const act = async (action: string, body: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await api.post(`/driver/shipments/${s.id}/${action}`, { ...(await here()), ...body });
      await refetch();
      void qc.invalidateQueries({ queryKey: ['driver'] });
      return true;
    } catch (e) {
      showError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const can = (a: string) => s.allowedActions.includes(a);
  const uploadAll = (uris: string[], purpose: 'POD_PHOTO' | 'PICKUP_PHOTO') => Promise.all(uris.map((u) => uploadUri(u, purpose)));

  const pickup = async () => {
    setBusy(true);
    const ids = await uploadAll(photos, 'PICKUP_PHOTO').catch((e: unknown) => (showError(e), null));
    setBusy(false);
    if (ids && (await act('pickup', { photoFileIds: ids }))) {
      setSheet(null);
      setPhotos([]);
    }
  };
  const deliver = async () => {
    setBusy(true);
    try {
      const [photoFileIds, sigUri] = await Promise.all([uploadAll(photos, 'POD_PHOTO'), sig.current?.capture() ?? null]);
      const signatureFileId = sigUri ? await uploadUri(sigUri, 'POD_SIGNATURE', 'image/png') : undefined;
      const items = s.items.map((i) => ({ orderItemId: i.orderItemId, deliveredQty: String(qtys[i.orderItemId] ?? Number(i.qty)) }));
      setBusy(false);
      const ok = await act('deliver', { receiverName: receiver || s.buyer.name, otp: otp || undefined, photoFileIds, signatureFileId, items, codCollected: Number(s.codAmount) > 0 ? cod || s.codAmount : undefined });
      if (ok) {
        toast(t('deliveredOk'));
        setSheet(null);
        router.back();
      }
    } catch (e) {
      setBusy(false);
      showError(e);
    }
  };

  const primary = can('accept') ? { label: t('actions.accept'), run: () => void act('accept') } : can('pickup') ? { label: t('actions.pickup'), run: () => setSheet('pickup') } : can('start') ? { label: t('actions.start'), run: () => void act('start') } : can('arrive') ? { label: t('actions.arrive'), run: () => void act('arrive') } : can('deliver') ? { label: t('actions.deliver'), run: () => { setCod(s.codAmount); setSheet('deliver'); } } : null;
  const route = s.route.map((p) => ({ latitude: p.lat, longitude: p.lng }));

  return (
    <Screen
      title={s.number}
      subtitle={s.supplierOrder.orderNumber}
      right={<StatusBadge kind="ShipmentStatus" value={s.status} />}
      footer={
        (primary || can('decline') || can('fail')) && (
          <View style={{ gap: 8 }}>
            {primary && <Button size="lg" title={primary.label} loading={busy} onPress={primary.run} style={{ backgroundColor: colors.navy[900] }} />}
            <Row>
              {can('decline') && <Button style={{ flex: 1 }} variant="outline" title={t('actions.decline')} onPress={() => void act('decline').then((ok) => ok && router.back())} />}
              {can('fail') && <Button style={{ flex: 1 }} variant="ghost" title={t('actions.fail')} onPress={() => setSheet('fail')} />}
            </Row>
          </View>
        )
      }
    >
      {nativeMapsAvailable ? (
      <View style={{ height: 200, borderRadius: 16, overflow: 'hidden' }}>
        <MapView style={{ flex: 1 }} initialRegion={{ latitude: (s.pickup.lat + s.dropoff.lat) / 2, longitude: (s.pickup.lng + s.dropoff.lng) / 2, latitudeDelta: Math.abs(s.pickup.lat - s.dropoff.lat) * 1.8 + 0.05, longitudeDelta: Math.abs(s.pickup.lng - s.dropoff.lng) * 1.8 + 0.05 }}>
          <Marker coordinate={{ latitude: s.pickup.lat, longitude: s.pickup.lng }} pinColor={colors.navy[900]} />
          <Marker coordinate={{ latitude: s.dropoff.lat, longitude: s.dropoff.lng }} pinColor={colors.green[600]} />
          {route.length > 1 && <Polyline coordinates={route} strokeColor={colors.green[600]} strokeWidth={4} />}
        </MapView>
      </View>
      ) : (
        <MapFallback height={140} />
      )}
      {[
        { icon: Store, title: t('pickupFrom'), name: s.pickup.name, address: s.pickup.address, phone: s.pickup.phone, lat: s.pickup.lat, lng: s.pickup.lng },
        { icon: MapPin, title: t('deliverTo'), name: `${s.buyer.name} · ${s.dropoff.recipientName}`, address: s.dropoff.formatted, phone: s.dropoff.recipientPhone ?? s.buyer.phone, lat: s.dropoff.lat, lng: s.dropoff.lng },
      ].map((p) => (
        <Card key={p.title} pad={14} style={{ gap: 6 }}>
          <Row>
            <p.icon size={18} color={colors.navy[900]} />
            <T size={12} color={colors.textMuted}>
              {p.title}
            </T>
          </Row>
          <T weight="extrabold">{p.name}</T>
          <T size={13} color={colors.textMuted}>
            {p.address}
          </T>
          <Row style={{ marginTop: 4 }}>
            <Button size="sm" variant="soft" title={t('navigate')} icon={<Navigation size={15} color={colors.green[800]} />} onPress={() => openMaps(p.lat, p.lng, p.name)} />
            {p.phone && <Button size="sm" variant="outline" title={t('call')} icon={<Phone size={15} color={colors.navy[900]} />} onPress={() => void Linking.openURL(`tel:${p.phone}`)} />}
          </Row>
        </Card>
      ))}
      <Card pad={14}>
        <T weight="extrabold" style={{ marginBottom: 6 }}>
          {t('items')}
        </T>
        {s.items.map((i) => (
          <Row key={i.orderItemId} style={{ paddingVertical: 6 }}>
            <Image source={deviceUrl(i.image)} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.gray[100] }} />
            <T size={13} weight="semibold" style={{ flex: 1 }} numberOfLines={2}>
              {i.name}
            </T>
            <T num weight="bold">
              {f.qty(i.qty)} × {i.unitName}
            </T>
          </Row>
        ))}
        {Number(s.codAmount) > 0 && (
          <>
            <Divider dashed />
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6}>
                <Banknote size={18} color={colors.amber[600]} />
                <T weight="bold">{t('cod')}</T>
              </Row>
              <T num weight="black" size={18} color={colors.amber[700]}>
                {f.money(s.codAmount)}
              </T>
            </Row>
          </>
        )}
      </Card>
      {s.etaAt && <KeyValue k="ETA" v={f.dateTime(s.etaAt)} />}

      <Sheet open={sheet === 'pickup'} onClose={() => setSheet(null)} title={t('actions.pickup')} footer={<Button title={t('actions.pickup')} loading={busy} onPress={() => void pickup()} />}>
        <T weight="bold">{t('pickupPhoto')}</T>
        <Photos uris={photos} label={t('addPhoto')} onAdd={() => void takePhoto().then((u) => u && setPhotos((p) => [...p, u]))} onRemove={(i) => setPhotos((p) => p.filter((_, x) => x !== i))} />
      </Sheet>

      <Sheet open={sheet === 'deliver'} onClose={() => setSheet(null)} title={t('podTitle')} footer={<Button title={t('confirmDelivery')} loading={busy} onPress={() => void deliver()} style={{ backgroundColor: colors.navy[900] }} />}>
        <Input label={t('receiverName')} placeholder={s.buyer.name} value={receiver} onChangeText={setReceiver} />
        <T weight="bold">{t('otp')}</T>
        <OtpInput value={otp} onChange={setOtp} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={12} color={colors.textMuted} style={{ flex: 1 }}>
            {t('otpHint')}
          </T>
          <Pressable onPress={() => void api.post(`/driver/shipments/${s.id}/resend-otp`).then(() => toast('✓')).catch(showError)}>
            <T size={12} weight="bold" color={colors.green[700]}>
              {t('resendOtp')}
            </T>
          </Pressable>
        </Row>
        <T weight="bold">{t('photos')}</T>
        <Photos uris={photos} label={t('addPhoto')} onAdd={() => void takePhoto().then((u) => u && setPhotos((p) => [...p, u]))} onRemove={(i) => setPhotos((p) => p.filter((_, x) => x !== i))} />
        <T weight="bold">{t('signature')}</T>
        <SignaturePad ref={sig} placeholder={t('signHere')} clearLabel={t('clearSignature')} />
        <T weight="bold">{t('deliveredQty')}</T>
        {s.items.map((i) => (
          <Row key={i.orderItemId} style={{ justifyContent: 'space-between' }}>
            <T size={13} style={{ flex: 1 }} numberOfLines={1}>
              {i.name}
            </T>
            <QuantityStepper size="sm" value={qtys[i.orderItemId] ?? Number(i.qty)} min={0} max={Number(i.qty)} onChange={(v) => setQtys((q) => ({ ...q, [i.orderItemId]: v }))} />
          </Row>
        ))}
        {Number(s.codAmount) > 0 && <Input label={t('codCollected')} ltr keyboardType="decimal-pad" value={cod} onChangeText={setCod} />}
      </Sheet>

      <Sheet open={sheet === 'fail'} onClose={() => setSheet(null)} title={t('failTitle')} footer={<Button variant="danger" title={t('submit')} loading={busy} onPress={() => void act('fail', { reason, note: note || undefined, photoFileIds: [] }).then((ok) => ok && setSheet(null))} />}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REASONS.map((r) => (
            <Chip key={r} label={t(`reasons.${r}`)} active={reason === r} onPress={() => setReason(r)} />
          ))}
        </View>
        <Input label={t('note')} value={note} onChangeText={setNote} multiline style={{ height: 80 }} />
      </Sheet>
    </Screen>
  );
}
