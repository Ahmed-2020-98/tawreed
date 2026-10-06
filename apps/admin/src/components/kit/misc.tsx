'use client';

import { Badge, Card, cn } from '@tawreed/ui';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { Link } from '@/i18n/navigation';
import { useFormat } from '@/lib/hooks/use-format';

export function PageHeader({ title, subtitle, actions, back }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: React.ReactNode } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-700">
          <ArrowRight className="size-4 ltr:rotate-180" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-navy-900">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

type Tone = 'gray' | 'brand' | 'navy' | 'amber' | 'red' | 'blue';
const TONES: Record<string, Tone> = {
  PENDING_PAYMENT: 'amber', PLACED: 'blue', PROCESSING: 'blue', PARTIALLY_DELIVERED: 'amber', DELIVERED: 'brand', COMPLETED: 'brand', CANCELLED: 'gray',
  AWAITING_PAYMENT: 'amber', PENDING: 'amber', ACCEPTED: 'blue', PREPARING: 'blue', READY: 'navy', OUT_FOR_DELIVERY: 'navy', REJECTED: 'red',
  ISSUED: 'blue', PARTIALLY_PAID: 'amber', PAID: 'brand', OVERDUE: 'red', VOID: 'gray', DEFERRED: 'navy', UNPAID: 'amber',
  INITIATED: 'gray', PENDING_VERIFICATION: 'amber', FAILED: 'red', REFUNDED: 'gray',
  OPEN: 'blue', QUOTED: 'navy', AWARDED: 'brand', CLOSED: 'gray', EXPIRED: 'gray', DRAFT: 'gray',
  SUBMITTED: 'amber', REVISION_REQUESTED: 'amber', WITHDRAWN: 'gray', APPROVED: 'brand', PENDING_APPROVAL: 'amber', PENDING_REVIEW: 'amber', PAUSED: 'gray', ARCHIVED: 'gray',
  ACTIVE: 'brand', NO_CREDIT: 'gray', FROZEN: 'red', SUSPENDED: 'red',
  VERIFIED: 'brand', UNDER_REVIEW: 'amber', NEEDS_INFO: 'amber', UNVERIFIED: 'gray',
  PENDING_ASSIGNMENT: 'amber', ASSIGNED: 'blue', PICKED_UP: 'navy', IN_TRANSIT: 'navy', ARRIVED: 'navy', RETURNED: 'gray',
  COLLECTED: 'amber', HANDED_OVER: 'blue', RECONCILED: 'brand',
  NEW: 'blue', CONTACTED: 'navy', QUALIFIED: 'brand',
  LOW: 'brand', MEDIUM: 'amber', HIGH: 'red',
};

/** Localized status pill; `kind` is the enum name in the shared catalog (enums.<kind>.<value>). */
export function StatusBadge({ kind, value, size = 'md' }: { kind: string; value: string | null | undefined; size?: 'sm' | 'md' }) {
  const t = useTranslations('enums');
  if (!value) return <span className="text-gray-400">—</span>;
  const key = `${kind}.${value}`;
  return (
    <Badge tone={TONES[value] ?? 'gray'} size={size} dot>
      {t.has(key as never) ? t(key as never) : value}
    </Badge>
  );
}

export function EnumLabel({ kind, value }: { kind: string; value: string | null | undefined }) {
  const t = useTranslations('enums');
  if (!value) return <>—</>;
  const key = `${kind}.${value}`;
  return <>{t.has(key as never) ? t(key as never) : value}</>;
}

export function Money({ value, className, muted }: { value: string | number | null | undefined; className?: string; muted?: boolean }) {
  const f = useFormat();
  return <span className={cn('num whitespace-nowrap font-bold', muted ? 'text-gray-500' : 'text-gray-900', className)}>{f.money(value)}</span>;
}

export function DateText({ value, time }: { value: string | null | undefined; time?: boolean }) {
  const f = useFormat();
  return <span className="whitespace-nowrap text-gray-600">{time ? f.dateTime(value) : f.date(value)}</span>;
}

/** Card with a header row. */
export function Section({ title, action, children, className, bodyClassName }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-[0.9375rem] font-bold text-gray-900">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Card>
  );
}

/** Label/value grid for detail pages. */
export function Facts({ items, cols = 2 }: { items: [React.ReactNode, React.ReactNode][]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', cols === 3 ? 'sm:grid-cols-3' : cols === 2 ? 'sm:grid-cols-2' : '')}>
      {items.map(([label, value], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-semibold text-gray-500">{label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-gray-900">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function KpiCard({ label, value, hint, icon, tone = 'navy', href }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: 'navy' | 'brand' | 'amber' | 'red'; href?: string }) {
  const toneCls = { navy: 'bg-navy-50 text-navy-800', brand: 'bg-brand-50 text-brand-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-600' }[tone];
  const body = (
    <Card className={cn('h-full p-5 transition', href && 'hover:border-brand-300 hover:shadow-md')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        {icon && <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-[1.1rem]', toneCls)}>{icon}</span>}
      </div>
      <p className="num mt-3 text-2xl font-extrabold tracking-tight text-navy-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Small "phone / email" contact line that stays LTR inside Arabic text. */
export function Ltr({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={cn('num inline-block', className)}>
      {children}
    </span>
  );
}
