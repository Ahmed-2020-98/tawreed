'use client';

import { Toaster as Sonner, toast } from 'sonner';

export { toast };

export function Toaster({ dir = 'rtl' }: { dir?: 'rtl' | 'ltr' }) {
  return (
    <Sonner
      dir={dir}
      position={dir === 'rtl' ? 'top-left' : 'top-right'}
      richColors
      closeButton
      toastOptions={{ className: 'font-sans !rounded-xl', style: { fontFamily: 'var(--font-sans)' } }}
    />
  );
}
