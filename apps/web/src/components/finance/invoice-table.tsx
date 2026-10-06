'use client';

import type { InvoiceSummaryDto } from '@tawreed/contracts';
import { Button, Checkbox, cn } from '@tawreed/ui';
import { CreditCard } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { StatusBadge } from '@/components/account/status-badge';
import { InvoiceButton } from '@/components/orders/order-actions';
import { Link } from '@/i18n/navigation';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';

/** Invoice list with multi-select card repayment of credit invoices. */
export function InvoiceTable({ invoices, selectable = true }: { invoices: InvoiceSummaryDto[]; selectable?: boolean }) {
  const t = useTranslations('account.invoices');
  const f = useFormat();
  const locale = useLocale();
  const api = useApi();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const payable = (i: InvoiceSummaryDto) => selectable && i.paymentMethod === 'CREDIT' && Number(i.balanceDue) > 0;
  const chosen = invoices.filter((i) => sel.has(i.id));
  const amount = chosen.reduce((s, i) => s + Number(i.balanceDue), 0);

  const pay = async (ids: string[]) => {
    setBusy(true);
    try {
      const r = await api.post<{ checkoutUrl: string }>('/buyer/payments/card', { purpose: 'CREDIT_REPAYMENT', invoiceIds: ids, returnUrl: `${window.location.origin}${locale === 'en' ? '/en' : ''}/checkout/result` });
      window.location.assign(r.checkoutUrl);
    } catch (e) {
      toastError(e);
      setBusy(false);
    }
  };

  return (
    <div>
      {chosen.length > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-900 px-5 py-3 text-white shadow-lg">
          <span className="num text-sm font-semibold">{t('selected', { count: chosen.length, amount: f.money(amount) })}</span>
          <Button variant="accent" size="sm" loading={busy} onClick={() => void pay(chosen.map((i) => i.id))}>
            <CreditCard />
            {t('paySelected')}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500">
            <tr>
              {selectable && <th className="w-10 px-4 py-3" />}
              <th className="px-4 py-3 text-start">{t('number')}</th>
              <th className="px-4 py-3 text-start">{t('supplier')}</th>
              <th className="px-4 py-3 text-start">{t('issueDate')}</th>
              <th className="px-4 py-3 text-start">{t('dueDate')}</th>
              <th className="px-4 py-3 text-end">{t('amount')}</th>
              <th className="px-4 py-3 text-end">{t('balance')}</th>
              <th className="px-4 py-3 text-start">{t('status')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((i) => (
              <tr key={i.id} className={cn('transition hover:bg-gray-50/70', sel.has(i.id) && 'bg-brand-50/50')}>
                {selectable && (
                  <td className="px-4 py-3">
                    {payable(i) && (
                      <Checkbox
                        aria-label={i.number}
                        checked={sel.has(i.id)}
                        onCheckedChange={(c) =>
                          setSel((s) => {
                            const n = new Set(s);
                            if (c) n.add(i.id);
                            else n.delete(i.id);
                            return n;
                          })
                        }
                      />
                    )}
                  </td>
                )}
                <td className="num px-4 py-3 font-bold text-gray-900">
                  <Link href={`/account/orders/${i.orderId}`} className="hover:text-brand-700">
                    {i.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{i.supplier.name}</td>
                <td className="num px-4 py-3 text-gray-600">{f.date(i.issueDate)}</td>
                <td className="num px-4 py-3">
                  <span className={i.isOverdue ? 'font-bold text-red-600' : 'text-gray-600'}>{f.date(i.dueDate)}</span>
                  {i.isOverdue && <span className="block text-[0.6875rem] text-red-500">{t('daysOverdue', { count: i.daysOverdue })}</span>}
                </td>
                <td className="num px-4 py-3 text-end font-semibold">{f.money(i.total)}</td>
                <td className="num px-4 py-3 text-end font-extrabold text-navy-900">{f.money(i.balanceDue)}</td>
                <td className="px-4 py-3">
                  <StatusBadge kind="InvoiceStatus" value={i.status} size="sm" />
                </td>
                <td className="px-4 py-3 text-end">
                  <InvoiceButton invoiceId={i.id} label="PDF" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
