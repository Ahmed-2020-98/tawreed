'use client';

import type { OrderSummaryDto } from '@tawreed/contracts';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useFormat } from '@/lib/hooks/use-format';
import { StatusBadge } from './status-badge';

export function OrderRow({ o }: { o: OrderSummaryDto }) {
  const t = useTranslations('account.orders');
  const f = useFormat();
  return (
    <Link href={`/account/orders/${o.id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50">
      <div className="hidden -space-x-3 sm:flex rtl:space-x-reverse">
        {o.thumbnails.slice(0, 3).map((src) => (
          <span key={src} className="size-11 overflow-hidden rounded-xl bg-gray-100 ring-2 ring-white">
            <img src={src} alt="" className="size-full object-cover" />
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num font-extrabold text-gray-900">{o.number}</span>
          <StatusBadge kind="OrderStatus" value={o.status} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-500">
          {f.date(o.placedAt ?? o.createdAt)} · {t('items', { count: o.itemsCount })} · {o.suppliers.map((s) => s.name).join('، ')}
        </p>
      </div>
      <div className="text-end">
        <p className="num font-extrabold text-navy-900">{f.money(o.grandTotal)}</p>
        <p className="text-xs text-gray-500">{o.paymentMethod && <StatusBadgeText value={o.paymentMethod} />}</p>
      </div>
      <ChevronLeft className="size-5 text-gray-300 transition group-hover:text-gray-500 ltr:rotate-180" />
    </Link>
  );
}

function StatusBadgeText({ value }: { value: string }) {
  const t = useTranslations('enums.PaymentMethod');
  return <>{t(value as 'CARD')}</>;
}
