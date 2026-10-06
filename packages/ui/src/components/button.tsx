import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-brand-400/40 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:shrink-0 [&_svg]:size-[1.15em]',
  {
    variants: {
      variant: {
        primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800',
        secondary: 'bg-navy-900 text-white shadow-sm hover:bg-navy-800',
        accent: 'bg-mint text-navy-950 shadow-sm hover:bg-brand-300',
        outline: 'border border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50',
        soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
        ghost: 'text-gray-700 hover:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        'danger-soft': 'bg-red-50 text-red-700 hover:bg-red-100',
        link: 'h-auto px-0 text-brand-700 underline-offset-4 hover:underline',
        inverse: 'bg-white text-navy-900 hover:bg-gray-100',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-9 px-3.5 text-sm',
        md: 'h-11 px-5 text-[0.9375rem]',
        lg: 'h-13 px-7 text-base',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, block, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size, block }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner className="absolute" />}
          <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
        </>
      )}
    </Comp>
  );
}
