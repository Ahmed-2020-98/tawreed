import { Check } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../lib/cn';

/** Horizontal progress steps (checkout, RFQ wizard, order progress). */
export function Steps({ steps, current, className }: { steps: React.ReactNode[]; current: number; className?: string }) {
  return (
    <ol className={cn('flex w-full items-start', className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={i} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            {i > 0 && <span className={cn('absolute top-4 h-0.5 w-full -translate-y-1/2 ltr:right-1/2 rtl:left-1/2', done || active ? 'bg-brand-600' : 'bg-gray-200')} aria-hidden />}
            <span
              className={cn(
                'relative z-10 grid size-8 place-items-center rounded-full border-2 font-display text-sm font-bold transition',
                done && 'border-brand-600 bg-brand-600 text-white',
                active && 'border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100',
                !done && !active && 'border-gray-200 bg-white text-gray-400',
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn('px-1 text-xs font-semibold sm:text-sm', active ? 'text-gray-900' : done ? 'text-brand-800' : 'text-gray-400')}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Arabic names get one letter (two read as a word, e.g. «يا»), skipping the article «ال». */
function initialsOf(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (/[\u0600-\u06FF]/.test(name)) {
    const w = words[0] ?? '';
    return (w.startsWith('ال') && w.length > 3 ? w[2] : w[0]) ?? '';
  }
  return words
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = initialsOf(name);
  return (
    <span className={cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-navy-100 font-bold text-navy-800', className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {src ? <img src={src} alt={name} className="size-full object-cover" /> : initials}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-display text-[0.6875rem] font-semibold text-gray-500">{children}</kbd>;
}

/** Numbered page links; `href(page)` builds each URL so it works with any router. */
export function Pagination({ page, totalPages, href, labels = { prev: 'Previous', next: 'Next' }, LinkComponent = 'a', className }: { page: number; totalPages: number; href: (p: number) => string; labels?: { prev: string; next: string }; LinkComponent?: React.ElementType; className?: string }) {
  if (totalPages <= 1) return null;
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const list = [...pages].sort((a, b) => a - b);
  const Link = LinkComponent;
  const item = 'grid h-10 min-w-10 place-items-center rounded-lg px-3 font-display text-sm font-semibold transition';
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1.5', className)}>
      {page > 1 && (
        <Link href={href(page - 1)} className={cn(item, 'text-gray-600 hover:bg-gray-100')}>
          {labels.prev}
        </Link>
      )}
      {list.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && list[i - 1]! < p - 1 && <span className="px-1 text-gray-400">…</span>}
          <Link href={href(p)} aria-current={p === page ? 'page' : undefined} className={cn(item, p === page ? 'bg-navy-900 text-white' : 'text-gray-700 hover:bg-gray-100')}>
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className={cn(item, 'text-gray-600 hover:bg-gray-100')}>
          {labels.next}
        </Link>
      )}
    </nav>
  );
}
