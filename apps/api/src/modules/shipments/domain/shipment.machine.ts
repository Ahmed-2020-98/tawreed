import type { ActorType, ShipmentStatus } from '@tawreed/contracts';

export type ShipmentAction = 'assign' | 'unassign' | 'accept' | 'decline' | 'pickup' | 'start' | 'arrive' | 'deliver' | 'fail' | 'cancel';

const T: Record<ShipmentAction, { from: ShipmentStatus[]; to: ShipmentStatus; actors: ActorType[] }> = {
  assign: { from: ['PENDING_ASSIGNMENT', 'ASSIGNED'], to: 'ASSIGNED', actors: ['SUPPLIER', 'STAFF'] },
  unassign: { from: ['ASSIGNED', 'ACCEPTED'], to: 'PENDING_ASSIGNMENT', actors: ['SUPPLIER', 'STAFF'] },
  accept: { from: ['ASSIGNED'], to: 'ACCEPTED', actors: ['DRIVER'] },
  decline: { from: ['ASSIGNED'], to: 'PENDING_ASSIGNMENT', actors: ['DRIVER'] },
  pickup: { from: ['ACCEPTED'], to: 'PICKED_UP', actors: ['DRIVER', 'STAFF'] },
  start: { from: ['PICKED_UP'], to: 'IN_TRANSIT', actors: ['DRIVER', 'STAFF'] },
  arrive: { from: ['IN_TRANSIT'], to: 'ARRIVED', actors: ['DRIVER', 'STAFF'] },
  deliver: { from: ['ARRIVED', 'IN_TRANSIT'], to: 'DELIVERED', actors: ['DRIVER', 'STAFF'] },
  fail: { from: ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'], to: 'FAILED', actors: ['DRIVER', 'STAFF'] },
  cancel: { from: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'ACCEPTED'], to: 'CANCELLED', actors: ['SUPPLIER', 'STAFF', 'SYSTEM'] },
};

export function shipmentNext(status: ShipmentStatus, action: ShipmentAction, actor: ActorType): ShipmentStatus | null {
  const t = T[action];
  return t.from.includes(status) && t.actors.includes(actor) ? t.to : null;
}

export function shipmentActions(status: ShipmentStatus, actor: ActorType): ShipmentAction[] {
  return (Object.keys(T) as ShipmentAction[]).filter((a) => shipmentNext(status, a, actor) !== null);
}

export const ACTIVE_SHIPMENT: ShipmentStatus[] = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'];
