import type { OfferManageDto } from '@tawreed/contracts';
import { api, Badge, Button, colors, deviceUrl, Header, Input, radii, Row, Sheet, T, useErrorToast, useFormat, useToast } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Crown, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Switch, View } from 'react-native';
import { useTranslations } from 'use-intl';

export default function Offers() {
  const t = useTranslations('supplier');
  const tm = useTranslations('mobile');
  const tc = useTranslations('common');
  const f = useFormat();
  const toast = useToast();
  const showError = useErrorToast();
  const [q, setQ] = useState('');
  const list = useQuery({ queryKey: ['supplier', 'offers', q], queryFn: () => api.page<OfferManageDto>('/supplier/offers', { query: { q: q || undefined, pageSize: 50 } }) });
  const [edit, setEdit] = useState<OfferManageDto | null>(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [busy, setBusy] = useState(false);
  const open = (o: OfferManageDto) => {
    setEdit(o);
    setPrice(o.price);
    setStock(o.stockQty);
  };
  const save = async (patch: Record<string, unknown>, id = edit?.id) => {
    if (!id) return;
    setBusy(true);
    try {
      await api.patch(`/supplier/offers/${id}`, patch);
      toast(t('saved'));
      setEdit(null);
      void list.refetch();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  const name = (o: OfferManageDto) => (f.locale === 'en' ? o.product.nameEn : o.product.nameAr);
  const unit = (o: OfferManageDto) => (f.locale === 'en' ? o.unit.nameEn : o.unit.nameAr);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header back={false} title={t('offersTitle')} />
      <FlatList
        data={list.data?.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.navy[900]} />}
        ListHeaderComponent={<Input value={q} onChangeText={setQ} placeholder={tm('searchPlaceholder')} start={<Search size={18} color={colors.gray[400]} />} containerStyle={{ marginBottom: 4 }} />}
        renderItem={({ item: o }) => (
          <Pressable onPress={() => open(o)} style={{ flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: radii.xl, padding: 10, borderWidth: 1, borderColor: colors.gray[100], opacity: o.status === 'ACTIVE' ? 1 : 0.6 }}>
            <Image source={deviceUrl(o.product.image?.thumbUrl)} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.gray[100] }} />
            <View style={{ flex: 1, gap: 2 }}>
              <T weight="bold" size={13} numberOfLines={1}>
                {name(o)}
              </T>
              <T size={12} color={colors.textMuted}>
                {unit(o)} · {t('available')}: <T num size={12} color={Number(o.availableQty) < 10 ? colors.red[600] : colors.textMuted}>{f.qty(o.availableQty)}</T>
              </T>
              <Row style={{ justifyContent: 'space-between' }}>
                <T num weight="extrabold" color={colors.navy[900]}>
                  {f.money(o.price)}
                </T>
                {o.isBuyBox ? <Badge tone="brand" icon={<Crown size={12} color={colors.green[800]} />} label={t('buyBox')} /> : o.bestCompetitorPrice ? <T num size={11} color={colors.amber[700]}>{t('bestCompetitor', { price: f.money(o.bestCompetitorPrice) })}</T> : null}
              </Row>
            </View>
            <Switch value={o.status === 'ACTIVE'} onValueChange={(v) => void save({ status: v ? 'ACTIVE' : 'PAUSED' }, o.id)} trackColor={{ true: colors.green[500], false: colors.gray[300] }} />
          </Pressable>
        )}
      />
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={t('editOffer')} footer={<Button title={tc('save')} loading={busy} onPress={() => void save({ price, stockQty: stock })} style={{ backgroundColor: colors.navy[900] }} />}>
        {edit && (
          <>
            <T weight="extrabold">{name(edit)}</T>
            <T size={12} color={colors.textMuted}>
              {unit(edit)}
            </T>
            <Input label={t('price')} ltr keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
            <Input label={t('stock')} ltr keyboardType="number-pad" value={stock} onChangeText={setStock} />
            {edit.tiers.length > 0 && (
              <T size={12} color={colors.textMuted}>
                {edit.tiers.map((x) => `${f.qty(x.minQty)}+ → ${f.money(x.price)}`).join('  ·  ')}
              </T>
            )}
          </>
        )}
      </Sheet>
    </View>
  );
}
