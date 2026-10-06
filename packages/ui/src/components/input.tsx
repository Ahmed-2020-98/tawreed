import * as React from 'react';
import { cn } from '../lib/cn';

const field =
  'w-full rounded-lg border border-gray-200 bg-white text-gray-900 shadow-xs transition-[border-color,box-shadow] placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-400/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/15';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Adornment on the inline-start side (icon, prefix). */
  start?: React.ReactNode;
  end?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export function Input({ className, start, end, inputSize = 'md', ...props }: InputProps) {
  const h = inputSize === 'sm' ? 'h-9 text-sm' : inputSize === 'lg' ? 'h-13 text-base' : 'h-11 text-[0.9375rem]';
  if (!start && !end) return <input className={cn(field, h, 'px-3.5', className)} {...props} />;
  return (
    <div className={cn('relative flex items-center', className)}>
      {start && <span className="pointer-events-none absolute start-3 flex items-center text-gray-400 [&_svg]:size-[1.1em]">{start}</span>}
      <input className={cn(field, h, start ? 'ps-10' : 'ps-3.5', end ? 'pe-12' : 'pe-3.5')} {...props} />
      {end && <span className="absolute end-2 flex items-center text-gray-500">{end}</span>}
    </div>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, 'min-h-24 px-3.5 py-2.5 text-[0.9375rem]', className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        field,
        "h-11 appearance-none bg-[length:1rem] bg-[position:left_0.75rem_center] bg-no-repeat pe-3.5 ps-9 text-[0.9375rem] bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B7787' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] ltr:bg-[position:right_0.75rem_center] ltr:pe-9 ltr:ps-3.5",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  return <label className={cn('text-sm font-semibold text-gray-800', className)} {...props} />;
}

export interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ms-0.5 text-red-600">*</span>}
        </Label>
      )}
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
