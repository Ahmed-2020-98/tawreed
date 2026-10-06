'use client';

import type { CityDto } from '@tawreed/contracts';
import { cn, Dialog, DialogContent, DialogTrigger, Input } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useSession } from '@/components/providers';
import { setCookie } from '@/lib/cookies';
import { useApi } from '@/lib/hooks/use-api';

export function CityPicker({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const t = useTranslations('header');
  const { city } = useSession();
  const api = useApi();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity });
  const current = cities.find((c) => c.slug === city);
  const filtered = cities.filter((c) => !q || c.name.includes(q) || c.names.en.toLowerCase().includes(q.toLowerCase()));

  const choose = (slug: string) => {
    setCookie('twb_city', slug);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn('group flex items-center gap-2 rounded-lg px-2 py-1.5 text-start transition', tone === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100', className)}>
        <MapPin className={cn('size-5 shrink-0', tone === 'dark' ? 'text-mint' : 'text-brand-600')} />
        <span className="leading-tight">
          <span className={cn('block text-[0.6875rem]', tone === 'dark' ? 'text-white/60' : 'text-gray-500')}>{t('deliverTo')}</span>
          <span className={cn('flex items-center gap-1 text-sm font-bold', tone === 'dark' ? 'text-white' : 'text-gray-900')}>
            {current?.name ?? '…'}
            <ChevronDown className="size-3.5 opacity-60 transition group-hover:translate-y-0.5" />
          </span>
        </span>
      </DialogTrigger>
      <DialogContent title={t('chooseCity')} description={t('cityHint')} size="sm">
        <Input start={<Search />} placeholder={t('chooseCity')} value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
        <ul className="-mx-2 max-h-80 overflow-y-auto">
          {filtered.map((c) => (
            <li key={c.slug}>
              <button type="button" onClick={() => choose(c.slug)} className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition hover:bg-gray-50', c.slug === city && 'bg-brand-50 font-bold text-brand-800')}>
                <span>{c.name}</span>
                <span className="text-xs text-gray-400">{c.region}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
