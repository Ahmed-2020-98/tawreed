import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import type { ProductDetailDto } from '@tawreed/contracts';
import { RfqWizard, type RfqWizardItem } from '@/components/rfq/rfq-wizard';
import { publicApi } from '@/lib/api';
import { requireBuyer } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('account.rfqNew'))('title') };
}

export default async function NewRfqPage({ params, searchParams }: PageProps<'/[locale]/rfq/new'>) {
  const { locale } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : []))).toString();
  await requireBuyer(locale, `/rfq/new${qs ? `?${qs}` : ''}`);
  // Prefill from a product page link (?product=slug&unit=id&qty=n).
  const initialItems: RfqWizardItem[] = [];
  if (typeof sp.product === 'string') {
    const p = await publicApi(locale).get<ProductDetailDto>(`/public/products/${sp.product}`).catch(() => null);
    const unit = p && (p.units.find((u) => u.id === sp.unit) ?? p.units.find((u) => u.isDefault) ?? p.units[0]);
    if (p && unit) initialItems.push({ key: p.id, productId: p.id, productUnitId: unit.id, name: p.name, image: p.image?.thumbUrl ?? null, qty: typeof sp.qty === 'string' ? sp.qty : '1', unitLabelAr: unit.name, unitLabelEn: unit.name, units: p.units.map((u) => ({ id: u.id, name: u.name })) });
  }
  return (
    <div className="container-page py-10">
      <Suspense>
        <RfqWizard initialItems={initialItems} />
      </Suspense>
    </div>
  );
}
