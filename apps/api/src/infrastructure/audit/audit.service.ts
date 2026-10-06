import { Injectable } from '@nestjs/common';
import type { ActorType } from '@tawreed/contracts';
import { RequestContext } from '../../common/context/request-context.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Db } from '../prisma/prisma.service.js';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
  actorType?: ActorType;
  actorId?: string | null;
}

const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

/** Append-only audit trail (DB trigger rejects updates/deletes). Pass the tx to keep it atomic. */
@Injectable()
export class AuditService {
  async record(db: Db, entry: AuditEntry): Promise<void> {
    const ctx = RequestContext.get();
    const actor = ctx?.actor;
    await db.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: json(entry.before),
        after: json(entry.after),
        meta: json(entry.meta),
        actorType: entry.actorType ?? actor?.contextType ?? 'SYSTEM',
        actorId: entry.actorId ?? actor?.userId ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent?.slice(0, 300) ?? null,
        requestId: ctx?.requestId ?? null,
      },
    });
  }
}
