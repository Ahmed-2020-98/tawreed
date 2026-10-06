'use client';

import type { CategoryDto } from '@tawreed/contracts';
import { Popover, PopoverContent, PopoverTrigger } from '@tawreed/ui';
import { ChevronLeft, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';

export function CategoryMenu({ categories }: { categories: CategoryDto[] }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(categories[0]?.slug);
  const current = categories.find((c) => c.slug === active);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex shrink-0 items-center gap-2 rounded-lg bg-navy-900 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-navy-800 data-[state=open]:bg-navy-800">
        <LayoutGrid className="size-4" />
        {t('allCategories')}
      </PopoverTrigger>
      <PopoverContent className="w-[min(58rem,calc(100vw-2rem))] p-0" onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}>
        <div className="grid grid-cols-[15rem_1fr]">
          <ul className="max-h-[28rem] overflow-y-auto border-e border-gray-100 bg-gray-50/60 p-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/c/${c.slug}`}
                  onMouseEnter={() => setActive(c.slug)}
                  onFocus={() => setActive(c.slug)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active === c.slug ? 'bg-white text-brand-800 shadow-xs' : 'text-gray-700 hover:bg-white'}`}
                >
                  {c.name}
                  <ChevronLeft className="size-4 opacity-50 ltr:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
          {current && (
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-lg font-extrabold text-gray-900">{current.name}</p>
                <Link href={`/c/${current.slug}`} className="text-sm font-bold text-brand-700 hover:underline">
                  {t('allCategories')}
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {current.children.map((s) => (
                  <Link key={s.slug} href={`/c/${s.slug}`} className="group flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 transition hover:border-brand-200 hover:bg-brand-50/40">
                    <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">{s.imageUrl && <img src={s.imageUrl.replace('_md.', '_thumb.')} alt="" className="size-full object-cover transition group-hover:scale-105" />}</span>
                    <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
