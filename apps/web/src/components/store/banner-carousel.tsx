'use client';

import type { BannerDto } from '@tawreed/contracts';
import { Button, cn } from '@tawreed/ui';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { bannerHref } from '@/lib/links';

export function BannerCarousel({ banners }: { banners: BannerDto[] }) {
  const rtl = useLocale() === 'ar';
  const [ref, api] = useEmblaCarousel({ loop: true, direction: rtl ? 'rtl' : 'ltr' });
  const [index, setIndex] = useState(0);
  const onSelect = useCallback(() => setIndex(api?.selectedScrollSnap() ?? 0), [api]);
  useEffect(() => {
    if (!api) return;
    api.on('select', onSelect);
    const id = setInterval(() => api.scrollNext(), 6000);
    return () => {
      clearInterval(id);
      api.off('select', onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div ref={ref} className="overflow-hidden">
        <div className="flex">
          {banners.map((b, i) => (
            <div key={b.id} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative h-64 sm:h-80 lg:h-[22rem]">
                <img src={b.imageUrl} alt="" className="absolute inset-0 size-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-navy-950/40 to-navy-950/85 rtl:bg-gradient-to-r" />
                <div className="relative flex h-full max-w-xl flex-col justify-center gap-3 px-6 sm:px-12">
                  <h2 className="text-balance text-2xl font-black leading-tight text-white sm:text-4xl">{b.title}</h2>
                  {b.subtitle && <p className="text-white/80 sm:text-lg">{b.subtitle}</p>}
                  {b.ctaLabel && (
                    <Button asChild variant="accent" className="mt-2 self-start">
                      <Link href={bannerHref(b)}>{b.ctaLabel}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {banners.length > 1 && (
        <>
          <div className="absolute bottom-4 start-6 flex gap-1.5 sm:start-12">
            {banners.map((b, i) => (
              <button key={b.id} type="button" aria-label={`${i + 1}`} onClick={() => api?.scrollTo(i)} className={cn('h-1.5 rounded-full bg-white/50 transition-all', i === index ? 'w-7 bg-white' : 'w-1.5')} />
            ))}
          </div>
          <div className="absolute bottom-3 end-4 hidden gap-2 sm:flex">
            <button type="button" aria-label="Previous" onClick={() => api?.scrollPrev()} className="grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <ChevronRight className="size-5 ltr:rotate-180" />
            </button>
            <button type="button" aria-label="Next" onClick={() => api?.scrollNext()} className="grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <ChevronLeft className="size-5 ltr:rotate-180" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
