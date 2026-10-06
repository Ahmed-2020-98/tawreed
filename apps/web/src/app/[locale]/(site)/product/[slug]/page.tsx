import type { ProductCardDto, ProductDetailDto } from '@tawreed/contracts';
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@tawreed/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FileText, Snowflake, ThermometerSnowflake } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FavoriteButton } from '@/components/store/product-actions';
import { ProductCard, ProductGrid } from '@/components/store/product-card';
import { ProductGallery } from '@/components/store/product-gallery';
import { Breadcrumbs } from '@/components/store/product-listing';
import { PurchasePanel } from '@/components/store/purchase-panel';
import { Link } from '@/i18n/navigation';
import { publicApi } from '@/lib/api';
import { catalogContext } from '@/lib/catalog';
import { SITE_URL } from '@/lib/config';
import { country } from '@/lib/country';

export async function generateMetadata({ params }: PageProps<'/[locale]/product/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await publicApi(locale)
    .get<ProductDetailDto>(`/public/products/${slug}`, { next: { revalidate: 120 } })
    .catch(() => null);
  if (!p) return {};
  return {
    title: p.seo.title,
    description: p.seo.description,
    alternates: { canonical: locale === 'ar' ? `/product/${slug}` : `/en/product/${slug}`, languages: { ar: `/product/${slug}`, en: `/en/product/${slug}` } },
    openGraph: { images: p.image ? [p.image.url] : undefined, title: p.seo.title, description: p.seo.description },
  };
}

export default async function ProductPage({ params }: PageProps<'/[locale]/product/[slug]'>) {
  const { slug } = await params;
  const { api, city, locale } = await catalogContext();
  const product = await api.get<ProductDetailDto>(`/public/products/${slug}`, { query: { city }, cache: 'no-store' }).catch(() => null);
  if (!product) notFound();
  const [related, t, ts] = await Promise.all([
    api.get<ProductCardDto[]>(`/public/products/${slug}/related`, { query: { city }, cache: 'no-store' }).catch(() => []),
    getTranslations('product'),
    getTranslations('store'),
  ]);
  const origin = country(product.originCountry, locale);
  const te = await getTranslations('enums.StorageType');
  const facts = [
    origin && [t('origin'), `${origin.flag} ${origin.name}`],
    product.brand && [t('brand'), product.brand.name],
    [t('storage'), te(product.storageType)],
    product.barcode && [t('barcode'), product.barcode],
  ].filter(Boolean) as [string, string][];

  const prices = product.offers.map((o) => Number(o.effectivePrice));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images.map((i) => i.url),
    description: product.description ?? product.seo.description,
    sku: product.slug,
    ...(product.barcode ? { gtin13: product.barcode } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    ...(prices.length
      ? { offers: { '@type': 'AggregateOffer', priceCurrency: 'SAR', lowPrice: Math.min(...prices).toFixed(2), highPrice: Math.max(...prices).toFixed(2), offerCount: prices.length, availability: 'https://schema.org/InStock', url: `${SITE_URL}/product/${product.slug}` } }
      : {}),
  };

  return (
    <div className="container-page py-6">
      {/* eslint-disable-next-line react/no-danger -- JSON-LD structured data, escaped below */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Breadcrumbs items={[{ href: '/', label: t('breadcrumbHome') }, ...product.breadcrumbs.map((b) => ({ href: `/c/${b.slug}`, label: b.name })), { label: product.name }]} />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] xl:grid-cols-[1fr_1fr_24rem]">
        <div className="relative">
          <ProductGallery images={product.images.length ? product.images : product.image ? [product.image] : []} name={product.name} />
          <FavoriteButton productId={product.id} initial={product.isFavorite} className="absolute end-4 top-4 size-11" />
        </div>

        <div className="xl:col-span-1">
          <div className="flex flex-wrap items-center gap-2">
            {product.storageType === 'FROZEN' && (
              <Badge tone="blue">
                <Snowflake />
                {ts('frozen')}
              </Badge>
            )}
            {product.storageType === 'CHILLED' && (
              <Badge tone="blue">
                <ThermometerSnowflake />
                {ts('chilled')}
              </Badge>
            )}
            {product.offersCount > 1 && <Badge tone="brand">{t('otherSuppliersCount', { count: product.offersCount })}</Badge>}
          </div>
          <h1 className="mt-3 text-balance text-3xl font-black leading-tight text-navy-900 sm:text-4xl">{product.name}</h1>
          {product.brand && (
            <Link href={`/brands/${product.brand.slug}`} className="mt-2 inline-block text-sm font-bold text-brand-700 hover:underline">
              {product.brand.name}
            </Link>
          )}
          <dl className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {facts.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-semibold text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>

          <Tabs defaultValue="specs" className="mt-8">
            <TabsList variant="line">
              <TabsTrigger value="specs">{t('tabs.specs')}</TabsTrigger>
              <TabsTrigger value="description">{t('tabs.description')}</TabsTrigger>
              <TabsTrigger value="shipping">{t('tabs.shipping')}</TabsTrigger>
            </TabsList>
            <TabsContent value="specs" className="pt-5">
              <table className="w-full overflow-hidden rounded-2xl text-sm">
                <tbody>
                  {product.specs.map((s, i) => (
                    <tr key={s.key} className={i % 2 ? 'bg-white' : 'bg-gray-100/70'}>
                      <th className="w-1/3 px-4 py-3 text-start font-semibold text-gray-500">{s.key}</th>
                      <td className="px-4 py-3 font-semibold text-gray-900">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
            <TabsContent value="description" className="pt-5 leading-8 text-gray-700">
              {product.description}
            </TabsContent>
            <TabsContent value="shipping" className="pt-5 leading-8 text-gray-700">
              {t('shippingBody')}
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex items-center gap-4 rounded-2xl bg-sand-100 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-sand-700">
              <FileText className="size-6" />
            </span>
            <div className="flex-1">
              <p className="font-extrabold text-navy-900">{t('bulkTitle')}</p>
              <p className="text-sm text-gray-600">{t('bulkBody')}</p>
            </div>
            <Link href={`/rfq/new?product=${product.slug}`} className="shrink-0 text-sm font-bold text-brand-700 hover:underline">
              {ts('requestQuote')}
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 xl:col-span-1 xl:row-span-2">
          <div className="xl:sticky xl:top-44">
            <PurchasePanel product={product} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-2xl font-black text-navy-900">{t('related')}</h2>
          <ProductGrid className="xl:grid-cols-5">
            {related.slice(0, 5).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  );
}
