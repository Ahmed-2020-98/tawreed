import type { ActorType, OrderStatus, SupplierOrderStatus } from '@tawreed/contracts';

export type SupplierOrderAction =
  | 'confirm_payment'
  | 'accept'
  | 'reject'
  | 'start_preparing'
  | 'mark_ready'
  | 'dispatch'
  | 'deliver'
  | 'partial_deliver'
  | 'delivery_failed'
  | 'complete'
  | 'cancel'
  | 'return';

interface Transition {
  from: SupplierOrderStatus[];
  to: SupplierOrderStatus;
  actors: ActorType[];
}

const T: Record<SupplierOrderAction, Transition> = {
  confirm_payment: { from: ['AWAITING_PAYMENT'], to: 'PENDING', actors: ['SYSTEM', 'STAFF'] },
  accept: { from: ['PENDING'], to: 'ACCEPTED', actors: ['SUPPLIER', 'STAFF'] },
  reject: { from: ['PENDING'], to: 'REJECTED', actors: ['SUPPLIER', 'STAFF'] },
  start_preparing: { from: ['ACCEPTED'], to: 'PREPARING', actors: ['SUPPLIER', 'STAFF'] },
  mark_ready: { from: ['ACCEPTED', 'PREPARING'], to: 'READY', actors: ['SUPPLIER', 'STAFF'] },
  dispatch: { from: ['READY', 'PARTIALLY_DELIVERED'], to: 'OUT_FOR_DELIVERY', actors: ['SYSTEM', 'DRIVER', 'STAFF'] },
  deliver: { from: ['OUT_FOR_DELIVERY', 'PARTIALLY_DELIVERED'], to: 'DELIVERED', actors: ['SYSTEM', 'DRIVER', 'STAFF'] },
  partial_deliver: { from: ['OUT_FOR_DELIVERY'], to: 'PARTIALLY_DELIVERED', actors: ['SYSTEM', 'DRIVER', 'STAFF'] },
  delivery_failed: { from: ['OUT_FOR_DELIVERY'], to: 'READY', actors: ['SYSTEM', 'DRIVER', 'STAFF'] },
  complete: { from: ['DELIVERED', 'PARTIALLY_DELIVERED'], to: 'COMPLETED', actors: ['SYSTEM', 'STAFF'] },
  cancel: { from: ['AWAITING_PAYMENT', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY'], to: 'CANCELLED', actors: ['BUYER', 'STAFF', 'SYSTEM', 'SUPPLIER'] },
  return: { from: ['DELIVERED', 'PARTIALLY_DELIVERED'], to: 'RETURNED', actors: ['STAFF'] },
};

/** Buyers may cancel only before preparation starts; suppliers cancel via reject; staff can cancel until dispatch. */
const CANCEL_FROM: Record<ActorType, SupplierOrderStatus[]> = {
  BUYER: ['AWAITING_PAYMENT', 'PENDING', 'ACCEPTED'],
  SUPPLIER: [],
  DRIVER: [],
  STAFF: ['AWAITING_PAYMENT', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY'],
  SYSTEM: ['AWAITING_PAYMENT', 'PENDING'],
};

export function canTransition(status: SupplierOrderStatus, action: SupplierOrderAction, actor: ActorType): boolean {
  const t = T[action];
  if (!t.from.includes(status) || !t.actors.includes(actor)) return false;
  if (action === 'cancel') return CANCEL_FROM[actor].includes(status);
  return true;
}

export function nextStatus(status: SupplierOrderStatus, action: SupplierOrderAction, actor: ActorType): SupplierOrderStatus | null {
  return canTransition(status, action, actor) ? T[action].to : null;
}

export function allowedActions(status: SupplierOrderStatus, actor: ActorType): SupplierOrderAction[] {
  return (Object.keys(T) as SupplierOrderAction[]).filter((a) => canTransition(status, a, actor));
}

const ACTIVE: SupplierOrderStatus[] = ['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
const DONE: SupplierOrderStatus[] = ['DELIVERED', 'COMPLETED', 'RETURNED'];
const DEAD: SupplierOrderStatus[] = ['CANCELLED', 'REJECTED'];

/** Aggregate order status derived from its supplier orders. */
export function deriveOrderStatus(statuses: SupplierOrderStatus[]): OrderStatus {
  if (!statuses.length) return 'PLACED';
  const live = statuses.filter((s) => !DEAD.includes(s));
  if (!live.length) return 'CANCELLED';
  if (live.every((s) => s === 'AWAITING_PAYMENT')) return 'PENDING_PAYMENT';
  if (live.every((s) => s === 'COMPLETED' || s === 'RETURNED')) return 'COMPLETED';
  if (live.every((s) => DONE.includes(s))) return 'DELIVERED';
  if (live.some((s) => DONE.includes(s) || s === 'PARTIALLY_DELIVERED')) return 'PARTIALLY_DELIVERED';
  if (live.some((s) => ACTIVE.includes(s))) return 'PROCESSING';
  return 'PLACED';
}

/** Progress steps for buyer-facing steppers (mockup: قبول → تجهيز → شحن → في الطريق → تسليم). */
export const PROGRESS_STEPS: SupplierOrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export function progressIndex(status: SupplierOrderStatus): number {
  switch (status) {
    case 'AWAITING_PAYMENT':
    case 'PENDING':
      return 0;
    case 'ACCEPTED':
      return 1;
    case 'PREPARING':
    case 'READY':
      return 2;
    case 'OUT_FOR_DELIVERY':
    case 'PARTIALLY_DELIVERED':
      return 3;
    case 'DELIVERED':
    case 'COMPLETED':
    case 'RETURNED':
      return 4;
    default:
      return -1;
  }
}
