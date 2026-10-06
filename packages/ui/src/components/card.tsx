import type * as React from 'react';
import { cn } from '../lib/cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-gray-200/80 bg-white shadow-xs', className)} {...props} />;
}

export function CardHeader({ className, title, description, action, children }: { className?: string; title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4', className)}>
      <div className="min-w-0">
        {title && <h3 className="text-base font-bold text-gray-900">{title}</h3>}
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200/70', className)} {...props} />;
}

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div role="separator" className={cn(vertical ? 'w-px self-stretch bg-gray-200' : 'h-px w-full bg-gray-200', className)} />;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      {icon && <div className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700 [&_svg]:size-8">{icon}</div>}
      <div>
        <p className="text-lg font-bold text-gray-900">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
