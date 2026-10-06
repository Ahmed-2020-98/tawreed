import type { CityDto, ProductDetailDto, RfqDetailDto, SearchSuggestionsDto } from '@tawreed/contracts';
import { api, Button, Card, Chip, colors, deviceUrl, Input, Row, Screen, Steps, T, useErrorToast, useToast } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Search, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslations } from 'use-intl';

interface Item {
  key: string;
  productId?: string;
  productUnitId?: string;
  name: string;
  image?: string | null;
  qty: string;
  unitLabel: string;
  units?: { id: string; name: string }[];
}

export default function NewRfq() {
  const params = useLocalSearchParams<{ product?: string; unit?: string; qty?: string }>();
  const t = useTranslations('account.rfqNew');
  const tc = useTranslations('common');
  const tp = useTranslations('enums.PaymentMethod');
  const toast = useToast();
  const showError = useErrorToast();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const [d, setD] = useState({ cityId: '', days: 7, pay: 'ANY', expires: 7, notes: '' });
  const [busy, setBusy] = useState(false);
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity });
  const sugg = useQuery({ queryKey: ['suggest', q], queryFn: () => api.get<SearchSuggestionsDto>('/public/search/suggest', { query: { q } }), enabled: q.trim().length >= 2 });

  const addProduct = async (slug: string, unitId?: string, qty?: string) => {
    const p = await api.get<ProductDetailDto>(`/public/products/${slug}`);
    const u = p.units.find((x) => x.id === unitId) ?? p.units.find((x) => x.isDefault) ?? p.units[0];
    setItems((s) => [...s, { key: `${p.id}-${Date.now()}`, productId: p.id, productUnitId: u?.id, name: p.name, image: p.image?.thumbUrl, qty: qty ?? '1', unitLabel: u?.name ?? '', units: p.units.map((x) => ({ id: x.id, name: x.name })) }]);
    setTitle((c) => c || p.name);
    setQ('');
  };
  const prefill = useQuery({ queryKey: ['rfq-prefill', params.product], queryFn: () => addProduct(params.product!, params.unit, params.qty).then(() => true), enabled: !!params.product, staleTime: Infinity });
  void prefill;
  const update = (key: string, patch: Partial<Item>) => setItems((s) => s.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const submit = async () => {
    setBusy(true);
    try {
      const neededBy = new Date(Date.now() + d.days * 86_400_000).toISOString().slice(0, 10);
      const r = await api.post<RfqDetailDto>('/buyer/rfqs', { title, cityId: d.cityId, neededBy, paymentPreference: d.pay, notes: d.notes || undefined, visibility: 'OPEN', supplierIds: [], attachmentFileIds: [], expiresInDays: d.expires, items: items.map((i) => ({ productId: i.productId, productUnitId: i.productUnitId, name: i.name, qty: i.qty, unitLabelAr: i.unitLabel || 'وحدة', unitLabelEn: i.unitLabel || 'Unit' })) });
      toast(t('submitted'));
      router.replace(`/rfqs/${r.id}`);
    } catch (e) {
      showError(e);
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t('title')}
      footer={
        <Row>
          {step > 0 && <Button variant="outline" title={tc('back')} onPress={() => setStep((s) => s - 1)} />}
          {step < 2 ? (
            <Button style={{ flex: 1 }} title={tc('next')} disabled={(step === 0 && (!items.length || title.trim().length < 3)) || (step === 1 && !d.cityId)} onPress={() => setStep((s) => s + 1)} />
          ) : (
            <Button style={{ flex: 1 }} title={t('submit')} loading={busy} onPress={() => void submit()} />
          )}
        </Row>
      }
    >
      <Steps current={step} steps={[t('steps.items'), t('steps.details'), t('steps.review')]} />
      {step === 0 && (
        <>
          <Input label={t('rfqTitle')} placeholder={t('rfqTitlePlaceholder')} value={title} onChangeText={setTitle} />
          <Input placeholder={t('searchProduct')} value={q} onChangeText={setQ} start={<Search size={18} color={colors.gray[400]} />} />
          {q.trim().length >= 2 && (
            <Card pad={4}>
              {sugg.data?.products.map((p) => (
                <Pressable key={p.slug} onPress={() => void addProduct(p.slug)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 }}>
                  <Image source={deviceUrl(p.imageUrl)} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.gray[100] }} />
                  <T size={13} weight="semibold" style={{ flex: 1 }}>
                    {p.name}
                  </T>
                </Pressable>
              ))}
              <Pressable onPress={() => { setItems((s) => [...s, { key: `free-${Date.now()}`, name: q.trim(), qty: '1', unitLabel: '' }]); setQ(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}>
                <Plus size={16} color={colors.green[700]} />
                <T size={13} weight="bold" color={colors.green[700]}>
                  {t('addFreeText', { q: q.trim() })}
                </T>
              </Pressable>
            </Card>
          )}
          {items.map((i) => (
            <Card key={i.key} pad={12} style={{ gap: 10 }}>
              <Row>
                <Image source={deviceUrl(i.image)} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.gray[100] }} />
                <T weight="bold" style={{ flex: 1 }} numberOfLines={2}>
                  {i.name}
                </T>
                <Pressable accessibilityLabel={t('remove')} onPress={() => setItems((s) => s.filter((x) => x.key !== i.key))}>
                  <Trash2 size={18} color={colors.gray[400]} />
                </Pressable>
              </Row>
              <Row>
                <Input containerStyle={{ flex: 1 }} label={t('qty')} ltr keyboardType="decimal-pad" value={i.qty} onChangeText={(v) => update(i.key, { qty: v.replace(/[^\d.]/g, '') })} />
                {i.units ? (
                  <View style={{ flex: 1.4, gap: 6 }}>
                    <T weight="semibold" size={13} color={colors.gray[700]}>
                      {t('unit')}
                    </T>
                    <Row style={{ flexWrap: 'wrap' }} gap={6}>
                      {i.units.map((u) => (
                        <Chip key={u.id} label={u.name} active={i.productUnitId === u.id} onPress={() => update(i.key, { productUnitId: u.id, unitLabel: u.name })} />
                      ))}
                    </Row>
                  </View>
                ) : (
                  <Input containerStyle={{ flex: 1 }} label={t('unit')} value={i.unitLabel} onChangeText={(v) => update(i.key, { unitLabel: v })} />
                )}
              </Row>
            </Card>
          ))}
        </>
      )}
      {step === 1 && (
        <>
          <T weight="bold">{t('city')}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cities.map((c) => (
              <Chip key={c.id} label={c.name} active={d.cityId === c.id} onPress={() => setD({ ...d, cityId: c.id })} />
            ))}
          </View>
          <T weight="bold">{t('neededBy')}</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {[3, 7, 14, 30].map((n) => (
              <Chip key={n} label={t('days', { count: n })} active={d.days === n} onPress={() => setD({ ...d, days: n })} />
            ))}
          </Row>
          <T weight="bold">{t('payment')}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label={t('paymentAny')} active={d.pay === 'ANY'} onPress={() => setD({ ...d, pay: 'ANY' })} />
            {(['CREDIT', 'BANK_TRANSFER', 'CARD', 'COD'] as const).map((m) => (
              <Chip key={m} label={tp(m)} active={d.pay === m} onPress={() => setD({ ...d, pay: m })} />
            ))}
          </View>
          <T weight="bold">{t('expires')}</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {[3, 7, 14].map((n) => (
              <Chip key={n} label={t('days', { count: n })} active={d.expires === n} onPress={() => setD({ ...d, expires: n })} />
            ))}
          </Row>
          <Card pad={12} style={{ backgroundColor: colors.green[50], borderColor: colors.green[100] }}>
            <T weight="bold" color={colors.green[900]}>
              {t('open')}
            </T>
            <T size={12} color={colors.green[800]}>
              {t('openHint')}
            </T>
          </Card>
          <Input label={t('notes')} value={d.notes} onChangeText={(v) => setD({ ...d, notes: v })} multiline style={{ height: 90 }} />
        </>
      )}
      {step === 2 && (
        <Card pad={14} style={{ gap: 6 }}>
          <T weight="extrabold" size={16}>
            {title}
          </T>
          {items.map((i) => (
            <Row key={i.key} style={{ justifyContent: 'space-between' }}>
              <T size={13} style={{ flex: 1 }}>
                {i.name}
              </T>
              <T num weight="bold" size={13}>
                {i.qty} {i.unitLabel}
              </T>
            </Row>
          ))}
          <T size={12} color={colors.textMuted}>
            {cities.find((c) => c.id === d.cityId)?.name} · {t('days', { count: d.days })}
          </T>
        </Card>
      )}
    </Screen>
  );
}
