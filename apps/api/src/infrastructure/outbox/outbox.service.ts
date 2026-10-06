import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Db } from '../prisma/prisma.service.js';

export type EventHandler<T = Record<string, unknown>> = (payload: T, meta: { eventId: string; type: string }) => Promise<void>;

/**
 * Transactional outbox. `publish()` writes the event in the caller's transaction; the dispatcher
 * (worker role) delivers it to handlers registered with `on()`. Handlers must be idempotent.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger('Outbox');
  private readonly handlers = new Map<string, EventHandler[]>();

  async publish(db: Db, type: string, payload: Record<string, unknown>, opts: { delayMs?: number } = {}): Promise<void> {
    await db.outboxEvent.create({
      data: {
        type,
        payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
        availableAt: new Date(Date.now() + (opts.delayMs ?? 0)),
      },
    });
  }

  on<T = Record<string, unknown>>(type: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(type, list);
  }

  async dispatch(eventId: string, type: string, payload: Record<string, unknown>): Promise<void> {
    const handlers = [...(this.handlers.get(type) ?? []), ...(this.handlers.get('*') ?? [])];
    for (const handler of handlers) {
      await handler(payload, { eventId, type });
    }
    if (!handlers.length) this.logger.debug(`No handlers for ${type}`);
  }
}
