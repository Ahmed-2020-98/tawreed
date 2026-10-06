import type { OrderDetailDto } from '@tawreed/contracts';
import { Button, Card } from '@tawreed/ui';
import { CheckCircle2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { serverApi } from '@/lib/api';
import { formatters } from '@/lib/format';
import { requireBuyer } from '@/lib/session';

export default async function SuccessPage({ params, searchParams }: PageProps<'/[locale]/checkout/success'>) {
  const { locale } = await params;
  const id = (await searchParams).order;
  await requireBuyer(locale, '/account/orders');
  if (typeof id !== 'string') notFound();
  const api = await serverApi(locale);
  const order = await api.get<OrderDetailDto>(`/buyer/orders/${id}`, { cache: 'no-store' }).catch(() => null);
  if (!order) notFound();
  const t = await getTranslations('checkout');
  const f = formatters(locale);
  const bank = order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus !== 'PAID';
  return (
    <div className="container-page max-w-2xl py-12">
      <Card className="overflow-hidden text-center">
        <div className="grain bg-brand-700 px-6 py-10 text-white">
          <CheckCircle2 className="mx-auto size-16 animate-in zoom-in duration-500" />
          <h1 className="mt-4 text-3xl font-black">{t('successTitle')}</h1>
          <p className="mt-2 text-white/85">{t('successBody', { number: order.number })}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 text-start">
            {order.supplierOrders.map((so) => (
              <div key={so.id} className="rounded-xl border border-gray-200 p-3">
                <p className="truncate text-sm font-bold text-gray-900">{so.supplier.name}</p>
                <p className="num text-xs text-gray-500">
                  {so.number} · {f.money(so.total)}
                </p>
              </div>
            ))}
          </div>
          {bank && (
            <div className="mt-6 rounded-2xl bg-sand-100 p-5 text-start">
              <p className="font-extrabold text-navy-900">{t('bankTitle')}</p>
              <p className="num mt-1 text-sm text-gray-700">{t('bankBody', { amount: f.money(order.grandTotal) })}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href={`/account/orders/${order.id}`}>{bank ? t('uploadProof') : t('viewOrder')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/store">{t('continueShopping')}</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
