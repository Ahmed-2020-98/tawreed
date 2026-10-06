import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../lib/cn';

export const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold [&_svg]:size-3.5', {
  variants: {
    tone: {
      gray: 'bg-gray-100 text-gray-700',
      brand: 'bg-brand-50 text-brand-800',
      navy: 'bg-navy-50 text-navy-800',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-red-50 text-red-700',
      blue: 'bg-blue-50 text-blue-700',
      solid: 'bg-navy-900 text-white',
      mint: 'bg-mint text-navy-950',
    },
    size: { sm: 'px-2 py-0.5 text-[0.6875rem]', md: 'px-2.5 py-1 text-xs' },
    dot: { true: 'before:size-1.5 before:rounded-full before:bg-current' },
  },
  defaultVariants: { tone: 'gray', size: 'md' },
});

export function Badge({ className, tone, size, dot, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size, dot }), className)} {...props} />;
}
