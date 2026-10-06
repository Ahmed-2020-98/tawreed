'use client';

import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import { Accordion as A, Checkbox as C, RadioGroup as R, Select as S, Switch as W, Tabs as TB } from 'radix-ui';
import * as React from 'react';
import { cn } from '../lib/cn';

/* ---------------------------------------------------------------- checkbox */
export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        'peer grid size-5 shrink-0 place-items-center rounded-md border border-gray-300 bg-white outline-none transition focus-visible:ring-3 focus-visible:ring-brand-400/30 data-[state=checked]:border-brand-700 data-[state=checked]:bg-brand-700 data-[state=checked]:text-white',
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Check className="size-3.5" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}

/* ------------------------------------------------------------- radio group */
export const RadioGroup = ({ className, ...props }: React.ComponentProps<typeof R.Root>) => <R.Root className={cn('grid gap-2.5', className)} {...props} />;

export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof R.Item>) {
  return (
    <R.Item className={cn('grid size-5 shrink-0 place-items-center rounded-full border border-gray-300 bg-white outline-none focus-visible:ring-3 focus-visible:ring-brand-400/30 data-[state=checked]:border-brand-700', className)} {...props}>
      <R.Indicator className="size-2.5 rounded-full bg-brand-700" />
    </R.Item>
  );
}

/** Large selectable card used for payment methods, delivery slots, etc. */
export function RadioCard({ value, className, children, disabled }: { value: string; className?: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <R.Item
      value={value}
      disabled={disabled}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-start outline-none transition hover:border-gray-300 focus-visible:ring-3 focus-visible:ring-brand-400/30 disabled:cursor-not-allowed disabled:opacity-55 data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-50/50 data-[state=checked]:ring-1 data-[state=checked]:ring-brand-600',
        className,
      )}
    >
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-gray-300 bg-white group-data-[state=checked]:border-brand-700">
        <span className="size-2.5 scale-0 rounded-full bg-brand-700 transition group-data-[state=checked]:scale-100" />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </R.Item>
  );
}

/* ------------------------------------------------------------------ switch */
export function Switch({ className, ...props }: React.ComponentProps<typeof W.Root>) {
  return (
    <W.Root className={cn('relative h-6 w-11 shrink-0 rounded-full bg-gray-300 outline-none transition focus-visible:ring-3 focus-visible:ring-brand-400/30 data-[state=checked]:bg-brand-600', className)} {...props}>
      <W.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition rtl:-translate-x-0.5 data-[state=checked]:translate-x-[1.375rem] rtl:data-[state=checked]:-translate-x-[1.375rem]" />
    </W.Root>
  );
}

/* ------------------------------------------------------------------ select */
export function Select({ value, onValueChange, placeholder, options, className, disabled, 'aria-label': ariaLabel }: { value?: string; onValueChange: (v: string) => void; placeholder?: string; options: { value: string; label: React.ReactNode }[]; className?: string; disabled?: boolean; 'aria-label'?: string }) {
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger aria-label={ariaLabel} className={cn('inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-[0.9375rem] text-gray-900 shadow-xs outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-400/20 data-[placeholder]:text-gray-400', className)}>
        <S.Value placeholder={placeholder} />
        <S.Icon>
          <ChevronDown className="size-4 text-gray-500" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={6} className="z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
          <S.Viewport>
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pe-8 ps-2.5 text-sm font-medium text-gray-700 outline-none data-[highlighted]:bg-gray-100 data-[state=checked]:text-brand-800">
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator className="absolute end-2.5">
                  <Check className="size-4" />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}

/* -------------------------------------------------------------------- tabs */
export const Tabs = TB.Root;
export const TabsContent = TB.Content;

export function TabsList({ className, variant = 'pill', ...props }: React.ComponentProps<typeof TB.List> & { variant?: 'pill' | 'line' }) {
  return <TB.List className={cn(variant === 'pill' ? 'inline-flex gap-1 rounded-xl bg-gray-100 p-1' : 'flex gap-6 border-b border-gray-200', className)} data-variant={variant} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TB.Trigger>) {
  return (
    <TB.Trigger
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-gray-500 outline-none transition hover:text-gray-800',
        'in-data-[variant=pill]:rounded-lg in-data-[variant=pill]:px-3.5 in-data-[variant=pill]:py-1.5 in-data-[variant=pill]:data-[state=active]:bg-white in-data-[variant=pill]:data-[state=active]:text-gray-900 in-data-[variant=pill]:data-[state=active]:shadow-sm',
        'in-data-[variant=line]:-mb-px in-data-[variant=line]:border-b-2 in-data-[variant=line]:border-transparent in-data-[variant=line]:pb-3 in-data-[variant=line]:data-[state=active]:border-brand-600 in-data-[variant=line]:data-[state=active]:text-brand-800',
        className,
      )}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- accordion */
export function Accordion({ items, className, defaultValue }: { items: { id: string; title: React.ReactNode; content: React.ReactNode }[]; className?: string; defaultValue?: string }) {
  return (
    <A.Root type="single" collapsible defaultValue={defaultValue} className={cn('divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white', className)}>
      {items.map((i) => (
        <A.Item key={i.id} value={i.id}>
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-[0.9375rem] font-bold text-gray-900 outline-none hover:text-brand-800 focus-visible:bg-gray-50">
              {i.title}
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-600 transition group-data-[state=open]:rotate-45 group-data-[state=open]:bg-brand-700 group-data-[state=open]:text-white">
                <Plus className="size-4" />
              </span>
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden text-[0.9375rem] leading-7 text-gray-600 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="px-5 pb-5">{i.content}</div>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}

/* -------------------------------------------------------- quantity stepper */
export function QuantityStepper({ value, onChange, min = 1, max, step = 1, size = 'md', disabled, labels = { dec: 'Decrease', inc: 'Increase' }, className }: { value: number; onChange: (v: number) => void; min?: number; max?: number | null; step?: number; size?: 'sm' | 'md' | 'lg'; disabled?: boolean; labels?: { dec: string; inc: string }; className?: string }) {
  // `draft` holds the text only while the user is typing; otherwise the input mirrors `value`.
  const [draft, setDraft] = React.useState<string | null>(null);
  const clamp = (v: number) => {
    let n = Math.max(min, Number.isFinite(v) ? v : min);
    if (max != null) n = Math.min(max, n);
    const stepped = Math.round((n - min) / step) * step + min;
    return Number(stepped.toFixed(3));
  };
  const h = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-10';
  const w = size === 'sm' ? 'w-8' : size === 'lg' ? 'w-12' : 'w-10';
  return (
    <div className={cn('inline-flex items-center rounded-lg border border-gray-200 bg-white', h, className)}>
      <button type="button" aria-label={labels.dec} disabled={disabled || value <= min} onClick={() => onChange(clamp(value - step))} className={cn('grid h-full place-items-center text-gray-600 hover:text-brand-700 disabled:text-gray-300', w)}>
        <Minus className="size-4" />
      </button>
      <input
        inputMode="decimal"
        aria-label="Quantity"
        value={draft ?? String(value)}
        disabled={disabled}
        onFocus={() => setDraft(String(value))}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
        onBlur={() => {
          const v = clamp(Number(draft ?? value));
          setDraft(null);
          if (v !== value) onChange(v);
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={cn('h-full min-w-10 border-x border-gray-200 bg-transparent text-center font-display text-sm font-bold text-gray-900 outline-none', size === 'lg' ? 'w-16 text-base' : 'w-12')}
      />
      <button type="button" aria-label={labels.inc} disabled={disabled || (max != null && value >= max)} onClick={() => onChange(clamp(value + step))} className={cn('grid h-full place-items-center text-gray-600 hover:text-brand-700 disabled:text-gray-300', w)}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- OTP input */
export function OtpInput({ length = 6, value, onChange, onComplete, autoFocus, invalid }: { length?: number; value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; autoFocus?: boolean; invalid?: boolean }) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const set = (next: string) => {
    const v = next.replace(/\D/g, '').slice(0, length);
    onChange(v);
    if (v.length === length) onComplete?.(v);
    refs.current[Math.min(v.length, length - 1)]?.focus();
  };
  return (
    <div dir="ltr" className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          maxLength={length}
          value={value[i] ?? ''}
          onChange={(e) => set(value.slice(0, i) + e.target.value.replace(/\D/g, '') + value.slice(i + 1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              e.preventDefault();
              set(value.slice(0, i - 1));
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            set(e.clipboardData.getData('text'));
          }}
          className="size-12 rounded-xl border border-gray-200 bg-white text-center font-display text-xl font-bold text-navy-900 shadow-xs outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-400/25 aria-invalid:border-red-500 sm:size-14"
        />
      ))}
    </div>
  );
}
