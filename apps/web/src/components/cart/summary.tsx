'use client';

import type { CartTotalsDto } from '@tawreed/contracts';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/lib/hooks/use-format';

export function TotalsList({ totals }: { totals: CartTotalsDto }) {
  const t = useTranslations('cart');
  const tc = useTranslations('common');
  const f = useFormat();
  const rows: [string, string, string?][] = [
    [t('subtotal'), f.money(totals.subtotal)],
    ...(Number(totals.discountTotal) > 0 ? [[t('discount'), `− ${f.money(totals.discountTotal)}`, 'text-brand-700'] as [string, string, string]] : []),
    [t('delivery'), Number(totals.deliveryTotal) ? f.money(totals.deliveryTotal) : tc('free')],
    [t('vat'), f.money(totals.vatTotal)],
  ];
  return (
    <div>
      <dl className="space-y-3 text-sm">
        {rows.map(([k, v, cls]) => (
          <div key={k} className="flex items-center justify-between">
            <dt className="text-gray-600">{k}</dt>
            <dd className={`num font-semibold text-gray-900 ${cls ?? ''}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="rule-dashed my-4" />
      <div className="flex items-baseline justify-between">
        <span className="font-extrabold text-gray-900">{t('grandTotal')}</span>
        <span className="num text-2xl font-black text-navy-900">{f.money(totals.grandTotal)}</span>
      </div>
      {Number(totals.savings) > 0 && <p className="num mt-2 rounded-lg bg-brand-50 px-3 py-1.5 text-center text-xs font-bold text-brand-800">{t('savings', { amount: f.money(totals.savings) })}</p>}
    </div>
  );
}
