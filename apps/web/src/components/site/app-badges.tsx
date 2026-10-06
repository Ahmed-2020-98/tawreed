import { cn } from '@tawreed/ui';

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden>
      <path d="M16.37 1.43c0 1.14-.47 2.26-1.2 3.07-.79.87-2.08 1.54-3.12 1.46-.13-1.1.42-2.27 1.14-3.03.8-.86 2.18-1.5 3.18-1.5ZM20.5 17.13c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.77-4.04-3.33C-.07 15.9-.36 10.83 1.36 8.16c1.22-1.9 3.15-3.01 4.96-3.01 1.85 0 3.01 1.01 4.54 1.01 1.48 0 2.38-1.01 4.52-1.01 1.61 0 3.32.88 4.54 2.39-3.99 2.19-3.34 7.89.58 9.59Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <path fill="#34A853" d="M3.6 1.8 13.8 12 3.6 22.2c-.4-.2-.6-.7-.6-1.2V3c0-.5.2-1 .6-1.2Z" />
      <path fill="#FBBC04" d="m17.2 8.6-3.4 3.4 3.4 3.4 3.9-2.2c.9-.5.9-1.9 0-2.4l-3.9-2.2Z" />
      <path fill="#4285F4" d="M3.6 1.8c.3-.2.8-.2 1.2 0l12.4 6.8-3.4 3.4L3.6 1.8Z" />
      <path fill="#EA4335" d="M3.6 22.2 13.8 12l3.4 3.4-12.4 6.8c-.4.2-.9.2-1.2 0Z" />
    </svg>
  );
}

export function AppBadges({ ios, android, tone = 'dark', className }: { ios: string; android: string; tone?: 'dark' | 'light'; className?: string }) {
  const base = cn('flex h-12 items-center gap-2.5 rounded-xl px-4 transition', tone === 'dark' ? 'bg-navy-950 text-white hover:bg-black' : 'border border-white/20 bg-white/10 text-white hover:bg-white/15');
  return (
    <div className={cn('flex flex-wrap gap-3', className)} dir="ltr">
      <a href={ios} target="_blank" rel="noreferrer" className={base}>
        <AppleIcon />
        <span className="text-start leading-none">
          <span className="block text-[0.625rem] opacity-75">Download on the</span>
          <span className="font-display text-[0.9375rem] font-semibold">App Store</span>
        </span>
      </a>
      <a href={android} target="_blank" rel="noreferrer" className={base}>
        <PlayIcon />
        <span className="text-start leading-none">
          <span className="block text-[0.625rem] opacity-75">GET IT ON</span>
          <span className="font-display text-[0.9375rem] font-semibold">Google Play</span>
        </span>
      </a>
    </div>
  );
}
