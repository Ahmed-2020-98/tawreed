import { cn } from '@tawreed/ui';

export function PageHero({ eyebrow, title, subtitle, children, tone = 'sand', image }: { eyebrow?: string; title: string; subtitle?: string; children?: React.ReactNode; tone?: 'sand' | 'navy' | 'green'; image?: string }) {
  const bg = { sand: 'bg-sand-100', navy: 'bg-navy-950 text-white', green: 'bg-brand-950 text-white' }[tone];
  const dark = tone !== 'sand';
  return (
    <section className={cn('grain relative overflow-hidden', bg)}>
      {image && <img src={image} alt="" className="absolute inset-y-0 end-0 hidden h-full w-1/2 object-cover opacity-90 [mask-image:linear-gradient(to_left,black_40%,transparent)] lg:block rtl:[mask-image:linear-gradient(to_right,black_40%,transparent)]" />}
      <img src={dark ? '/brand/logo-mark-white.svg' : '/brand/logo-mark.svg'} alt="" aria-hidden className="pointer-events-none absolute -bottom-20 start-[-6%] w-96 opacity-[0.07]" />
      <div className="container-page relative py-16 lg:py-24">
        <div className="max-w-2xl">
          {eyebrow && <p className={cn('mb-4 text-sm font-extrabold', dark ? 'text-mint' : 'text-brand-700')}>{eyebrow}</p>}
          <h1 className={cn('text-balance text-4xl font-black leading-tight sm:text-5xl', dark ? 'text-white' : 'text-navy-900')}>{title}</h1>
          {subtitle && <p className={cn('mt-5 text-lg leading-8', dark ? 'text-white/75' : 'text-gray-700')}>{subtitle}</p>}
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
      </div>
    </section>
  );
}
