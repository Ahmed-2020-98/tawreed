'use client';

import { Badge } from '@tawreed/ui';
import { useTranslations } from 'next-intl';

type Tone = 'gray' | 'brand' | 'navy' | 'amber' | 'red' | 'blue';
const TONES: Record<string, Tone> = {
  PENDING_PAYMENT: 'amber', PLACED: 'blue', PROCESSING: 'blue', PARTIALLY_DELIVERED: 'amber', DELIVERED: 'brand', COMPLETED: 'brand', CANCELLED: 'gray',
  PENDING: 'amber', ACCEPTED: 'blue', PREPARING: 'blue', READY: 'navy', OUT_FOR_DELIVERY: 'navy', REJECTED: 'red',
  ISSUED: 'blue', PARTIALLY_PAID: 'amber', PAID: 'brand', OVERDUE: 'red', VOID: 'gray',
  INITIATED: 'gray', PENDING_VERIFICATION: 'amber', FAILED: 'red', REFUNDED: 'gray',
  OPEN: 'blue', QUOTED: 'navy', AWARDED: 'brand', CLOSED: 'gray', EXPIRED: 'gray', DRAFT: 'gray',
  SUBMITTED: 'blue', REVISION_REQUESTED: 'amber', WITHDRAWN: 'gray',
  ACTIVE: 'brand', NO_CREDIT: 'gray', FROZEN: 'red', SUSPENDED: 'red',
  VERIFIED: 'brand', UNDER_REVIEW: 'amber', NEEDS_INFO: 'amber', UNVERIFIED: 'gray',
  ASSIGNED: 'blue', PICKED_UP: 'navy', IN_TRANSIT: 'navy', ARRIVED: 'navy', RETURNED: 'gray',
};

/** Localized status pill; `kind` is the enum name in the shared catalog (enums.<kind>.<value>). */
export function StatusBadge({ kind, value, size = 'md' }: { kind: string; value: string; size?: 'sm' | 'md' }) {
  const t = useTranslations('enums');
  const key = `${kind}.${value}`;
  return (
    <Badge tone={TONES[value] ?? 'gray'} size={size} dot>
      {t.has(key as never) ? t(key as never) : value}
    </Badge>
  );
}
