import type { CartTotalsDto } from '@tawreed/contracts';
import { colors, Divider, KeyValue, Row, T, useFormat } from '@tawreed/mobile';
import { useTranslations } from 'use-intl';

export function Totals({ totals }: { totals: CartTotalsDto }) {
  const t = useTranslations('cart');
  const tc = useTranslations('common');
  const f = useFormat();
  return (
    <>
      <KeyValue k={t('subtotal')} v={f.money(totals.subtotal)} num />
      {Number(totals.discountTotal) > 0 && <KeyValue k={t('discount')} v={`− ${f.money(totals.discountTotal)}`} num />}
      <KeyValue k={t('delivery')} v={Number(totals.deliveryTotal) ? f.money(totals.deliveryTotal) : tc('free')} num />
      <KeyValue k={t('vat')} v={f.money(totals.vatTotal)} num />
      <Divider dashed />
      <Row style={{ justifyContent: 'space-between' }}>
        <T weight="extrabold" size={16}>
          {t('grandTotal')}
        </T>
        <T num weight="black" size={20} color={colors.navy[900]}>
          {f.money(totals.grandTotal)}
        </T>
      </Row>
    </>
  );
}
