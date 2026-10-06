import { cn } from '@tawreed/ui';

export function SectionHeading({ eyebrow, title, subtitle, align = 'start', tone = 'light', action, className }: { eyebrow?: string; title: string; subtitle?: string; align?: 'start' | 'center'; tone?: 'light' | 'dark'; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', align === 'center' && 'items-center text-center sm:flex-col sm:items-center', className)}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p className={cn('mb-3 inline-flex items-center gap-2 text-sm font-extrabold', tone === 'dark' ? 'text-mint' : 'text-brand-700')}>
            <span className={cn('h-0.5 w-6 rounded-full', tone === 'dark' ? 'bg-mint' : 'bg-brand-600')} />
            {eyebrow}
          </p>
        )}
        <h2 className={cn('text-balance text-3xl font-black leading-[1.25] sm:text-4xl', tone === 'dark' ? 'text-white' : 'text-navy-900')}>{title}</h2>
        {subtitle && <p className={cn('mt-3 text-lg', tone === 'dark' ? 'text-white/70' : 'text-gray-600')}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
