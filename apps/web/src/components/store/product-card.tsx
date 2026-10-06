import type { ProductCardDto } from '@tawreed/contracts';
import { Badge, cn } from '@tawreed/ui';
import { Snowflake, Store, ThermometerSnowflake } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { country } from '@/lib/country';
import { formatters } from '@/lib/format';
import { FavoriteButton, QuickAdd } from './product-actions';

export async function ProductCard({ product: p, className, priority }: { product: ProductCardDto; className?: string; priority?: boolean }) {
  const locale = await getLocale();
  const t = await getTranslations('store');
  const tc = await getTranslations('common');
  const f = formatters(locale);
  const o = p.bestOffer;
  const origin = country(p.originCountry, locale);
  const discount = o?.deal ? Math.round((1 - Number(o.effectivePrice) / Number(o.price)) * 100) : o?.compareAtPrice ? Math.round((1 - Number(o.price) / Number(o.compareAtPrice)) * 100) : 0;
  const out = o?.stockStatus === 'OUT_OF_STOCK';
  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg', className)}>
      <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden bg-gray-100">
        {p.image && <img src={p.image.url} alt={p.image.alt ?? p.name} loading={priority ? 'eager' : 'lazy'} className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />}
        <div className="absolute start-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {discount > 0 && <Badge tone="red" className="bg-red-600 text-white">{t('save', { percent: discount })}</Badge>}
          {p.storageType === 'FROZEN' && (
            <Badge tone="blue" className="bg-white/95 backdrop-blur">
              <Snowflake />
              {t('frozen')}
            </Badge>
          )}
          {p.storageType === 'CHILLED' && (
            <Badge tone="blue" className="bg-white/95 backdrop-blur">
              <ThermometerSnowflake />
              {t('chilled')}
            </Badge>
          )}
        </div>
      </Link>
      <FavoriteButton productId={p.id} initial={p.isFavorite} className="absolute end-2.5 top-2.5" />

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {origin && <span title={origin.name}>{origin.flag}</span>}
          <span className="truncate">{p.brand?.name ?? p.category.name}</span>
        </div>
        <Link href={`/product/${p.slug}`} className="mt-1 line-clamp-2 min-h-[2.75rem] text-[0.9375rem] font-bold leading-snug text-gray-900 hover:text-brand-800">
          {p.name}
        </Link>

        {o ? (
          <div className="mt-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="num whitespace-nowrap text-lg font-extrabold text-navy-900">{f.money(o.effectivePrice)}</span>
              {discount > 0 && <span className="num whitespace-nowrap text-xs text-gray-400 line-through">{f.money(o.deal ? o.price : o.compareAtPrice)}</span>}
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {o.unit.name}
              {Number(o.unit.baseQuantity) !== 1 && <span className="num"> · {t('perBase', { price: f.money(o.pricePerBaseUnit), unit: o.unit.baseUnit })}</span>}
            </p>
            {p.offersCount > 1 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-brand-700">
                <Store className="size-3.5" />
                {tc('suppliersCount', { count: p.offersCount })}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2.5 text-sm font-semibold text-gray-500">{t('onRequest')}</p>
        )}

        <div className="mt-auto pt-3">
          {o ? (
            <QuickAdd offerId={o.id} qty={o.minOrderQty} disabled={out} />
          ) : (
            <Link href={`/rfq/new?product=${p.slug}`} className="flex h-9 items-center justify-center rounded-lg border border-gray-200 text-sm font-bold text-navy-900 hover:bg-gray-50">
              {t('requestQuote')}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4', className)}>{children}</div>;
}
