import { ApiError } from '@tawreed/api-client';
import type { AddressDto, CityDto } from '@tawreed/contracts';
import { api, Badge, Button, Card, Chip, colors, EmptyState, Input, nativeMapsAvailable, Row, Screen, Sheet, T, useErrorToast, useFormat } from '@tawreed/mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { LocateFixed, MapPin, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import MapView from 'react-native-maps';
import { useTranslations } from 'use-intl';

function AddressForm({ onSaved }: { onSaved: () => void }) {
  const t = useTranslations('checkout.address_form');
  const showError = useErrorToast();
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity });
  const [f, setF] = useState({ label: '', recipientName: '', recipientPhone: '', cityId: '', district: '', street: '', buildingNumber: '', lat: 24.7136, lng: 46.6753, isDefault: false });
  const [region, setRegion] = useState({ latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const locate = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return;
    const p = await Location.getCurrentPositionAsync({});
    setRegion((r) => ({ ...r, latitude: p.coords.latitude, longitude: p.coords.longitude }));
    setF((s) => ({ ...s, lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }));
  };
  return (
    <>
      <T weight="semibold" size={13} color={colors.gray[700]}>
        {t('pin')}
      </T>
      <View style={{ height: 200, borderRadius: 16, overflow: 'hidden' }}>
        {nativeMapsAvailable ? (
          <MapView style={{ flex: 1 }} region={region} onRegionChangeComplete={(r) => { setRegion(r); setF((s) => ({ ...s, lat: Number(r.latitude.toFixed(6)), lng: Number(r.longitude.toFixed(6)) })); }} />
        ) : (
          // No Google Maps key in this Android build: the pin comes from the device location (locate button).
          <View style={{ flex: 1, backgroundColor: colors.sand[100] }} />
        )}
        <View pointerEvents="none" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -16, marginTop: -32 }}>
          <MapPin size={32} color="#fff" fill={colors.green[600]} />
        </View>
        <Pressable accessibilityLabel="locate" onPress={() => void locate()} style={{ position: 'absolute', bottom: 10, end: 10, width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <LocateFixed size={20} color={colors.navy[900]} />
        </Pressable>
      </View>
      <T size={12} color={colors.textMuted}>
        {t('pinHint')}
      </T>
      <Input label={t('label')} placeholder={t('labelPlaceholder')} value={f.label} onChangeText={(v) => setF({ ...f, label: v })} error={errors.label} />
      <T weight="semibold" size={13} color={colors.gray[700]}>
        {t('city')}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {cities.map((c) => (
          <Chip key={c.id} label={c.name} active={f.cityId === c.id} onPress={() => { setF({ ...f, cityId: c.id }); setRegion((r) => ({ ...r, latitude: c.lat, longitude: c.lng })); }} />
        ))}
      </View>
      <Input label={t('district')} value={f.district} onChangeText={(v) => setF({ ...f, district: v })} error={errors.district} />
      <Input label={t('street')} value={f.street} onChangeText={(v) => setF({ ...f, street: v })} />
      <Input label={t('building')} ltr value={f.buildingNumber} onChangeText={(v) => setF({ ...f, buildingNumber: v })} />
      <Input label={t('recipient')} value={f.recipientName} onChangeText={(v) => setF({ ...f, recipientName: v })} error={errors.recipientName} />
      <Input label={t('phone')} ltr keyboardType="phone-pad" value={f.recipientPhone} onChangeText={(v) => setF({ ...f, recipientPhone: v })} error={errors.recipientPhone} />
      <Chip label={t('setDefault')} active={f.isDefault} onPress={() => setF({ ...f, isDefault: !f.isDefault })} />
      <Button
        title={t('save')}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setErrors({});
          try {
            await api.post<AddressDto>('/buyer/addresses', { ...f, street: f.street || undefined, buildingNumber: f.buildingNumber || undefined });
            onSaved();
          } catch (e) {
            if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
            else showError(e);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

export default function Addresses() {
  const t = useTranslations('account.addresses');
  const tc = useTranslations('checkout');
  const f = useFormat();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<AddressDto[]>('/buyer/addresses') });
  return (
    <Screen title={t('title')} footer={<Button title={t('add')} icon={<Plus size={18} color="#fff" />} onPress={() => setOpen(true)} />}>
      {data.length === 0 && <EmptyState icon={<MapPin size={32} color={colors.green[700]} />} title={t('empty')} />}
      {data.map((a) => (
        <Card key={a.id} pad={14} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <MapPin size={16} color={colors.green[700]} />
              <T weight="bold">{a.label}</T>
              {a.isDefault && <Badge tone="brand" label={tc('default')} />}
            </Row>
            <Pressable
              accessibilityLabel={t('delete')}
              onPress={() =>
                Alert.alert(t('deleteConfirm'), undefined, [
                  { text: '✕', style: 'cancel' },
                  { text: t('delete'), style: 'destructive', onPress: () => void api.delete(`/buyer/addresses/${a.id}`).then(() => qc.invalidateQueries({ queryKey: ['addresses'] })) },
                ])
              }
            >
              <Trash2 size={18} color={colors.gray[400]} />
            </Pressable>
          </Row>
          <T size={13} color={colors.textMuted}>
            {a.formatted}
          </T>
          <T num size={12} color={colors.textSubtle}>
            {a.recipientName} · {a.recipientPhone.replace('+966', '0')} · {f.pick(a.city.name)}
          </T>
        </Card>
      ))}
      <Sheet open={open} onClose={() => setOpen(false)} title={t('add')}>
        <AddressForm
          onSaved={() => {
            setOpen(false);
            void qc.invalidateQueries({ queryKey: ['addresses'] });
            void qc.invalidateQueries({ queryKey: ['checkout-options'] });
          }}
        />
      </Sheet>
    </Screen>
  );
}
