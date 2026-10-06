import { Injectable } from '@nestjs/common';
import type { ActorType } from '@tawreed/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Db } from '../../infrastructure/prisma/prisma.service.js';

export interface OrderEventInput {
  orderId: string;
  supplierOrderId?: string | null;
  shipmentId?: string | null;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorType: ActorType;
  actorId?: string | null;
  note?: string | null;
  meta?: Record<string, unknown>;
}

/** Writes timeline entries shown on every order screen. */
@Injectable()
export class OrderEventsService {
  async add(db: Db, e: OrderEventInput): Promise<void> {
    await db.orderEvent.create({
      data: {
        orderId: e.orderId,
        supplierOrderId: e.supplierOrderId ?? null,
        shipmentId: e.shipmentId ?? null,
        type: e.type,
        fromStatus: e.fromStatus ?? null,
        toStatus: e.toStatus ?? null,
        actorType: e.actorType,
        actorId: e.actorId ?? null,
        note: e.note ?? null,
        meta: (e.meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
