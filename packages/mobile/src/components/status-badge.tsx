import { useTranslations } from 'use-intl';
import { Badge } from './surface';

type Tone = 'gray' | 'brand' | 'navy' | 'amber' | 'red' | 'blue';
const TONES: Record<string, Tone> = {
  PENDING_PAYMENT: 'amber', PLACED: 'blue', PROCESSING: 'blue', PARTIALLY_DELIVERED: 'amber', DELIVERED: 'brand', COMPLETED: 'brand', CANCELLED: 'gray',
  PENDING: 'amber', ACCEPTED: 'blue', PREPARING: 'blue', READY: 'navy', OUT_FOR_DELIVERY: 'navy', REJECTED: 'red',
  ISSUED: 'blue', PARTIALLY_PAID: 'amber', PAID: 'brand', OVERDUE: 'red', VOID: 'gray',
  OPEN: 'blue', QUOTED: 'navy', AWARDED: 'brand', CLOSED: 'gray', EXPIRED: 'gray', SUBMITTED: 'blue', REVISION_REQUESTED: 'amber', WITHDRAWN: 'gray',
  ACTIVE: 'brand', FROZEN: 'red', VERIFIED: 'brand', UNDER_REVIEW: 'amber',
  ASSIGNED: 'blue', PICKED_UP: 'navy', IN_TRANSIT: 'navy', ARRIVED: 'navy', FAILED: 'red', RETURNED: 'gray',
};

/** Localized status pill from the shared enum catalog (enums.<kind>.<value>). */
export function StatusBadge({ kind, value }: { kind: string; value: string }) {
  const t = useTranslations('enums');
  const key = `${kind}.${value}`;
  return <Badge dot tone={TONES[value] ?? 'gray'} label={t.has(key as never) ? t(key as never) : value} />;
}
