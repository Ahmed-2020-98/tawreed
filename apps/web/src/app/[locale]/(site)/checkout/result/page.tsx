import type { PaymentVerifyResult } from '@tawreed/contracts';
import { Button, Card } from '@tawreed/ui';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { serverApi } from '@/lib/api';
import { requireBuyer } from '@/lib/session';

/** Tap redirects here with ?payment=<id>; the API verifies the charge with Tap (source of truth). */
export default async function PaymentResultPage({ params, searchParams }: PageProps<'/[locale]/checkout/result'>) {
  const { locale } = await params;
  const paymentId = (await searchParams).payment;
  await requireBuyer(locale, '/account/orders');
  const t = await getTranslations('checkout');
  const api = await serverApi(locale);
  const r = typeof paymentId === 'string' ? await api.get<PaymentVerifyResult>(`/buyer/payments/${paymentId}/verify`, { cache: 'no-store' }).catch(() => null) : null;
  if (r?.status === 'PAID' && r.orderId) redirect({ href: `/checkout/success?order=${r.orderId}`, locale });
  const ok = r?.status === 'PAID';
  return (
    <div className="container-page max-w-lg py-16">
      <Card className="p-8 text-center">
        {ok ? <CheckCircle2 className="mx-auto size-16 text-brand-600" /> : <XCircle className="mx-auto size-16 text-red-500" />}
        <h1 className="mt-4 text-2xl font-black text-navy-900">{ok ? t('resultPaid') : t('resultFailed')}</h1>
        <p className="mt-2 text-gray-600">{r?.message ?? t('resultFailedBody')}</p>
        <div className="mt-6 flex justify-center gap-3">
          {r?.orderId && (
            <Button asChild>
              <Link href={`/account/orders/${r.orderId}`}>{t('viewOrder')}</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/cart">{t('tryAgain')}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
