import { cn } from '@tawreed/ui';

/** Horizontal Tawreed logo (swoosh mark + bilingual wordmark). */
export function Logo({ variant = 'color', className }: { variant?: 'color' | 'white'; className?: string }) {
  return <img src={variant === 'white' ? '/brand/logo-horizontal-white.svg' : '/brand/logo-horizontal.svg'} alt="توريد Tawreed" width={169} height={50} className={cn('h-10 w-auto', className)} />;
}

export function LogoMark({ variant = 'color', className }: { variant?: 'color' | 'white'; className?: string }) {
  return <img src={variant === 'white' ? '/brand/logo-mark-white.svg' : '/brand/logo-mark.svg'} alt="" aria-hidden width={48} height={40} className={cn('h-8 w-auto', className)} />;
}
