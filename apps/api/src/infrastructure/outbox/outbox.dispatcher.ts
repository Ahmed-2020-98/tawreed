import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import { OutboxService } from './outbox.service.js';

interface OutboxRow {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
}

/**
 * Polls pending outbox rows (FOR UPDATE SKIP LOCKED, safe with several workers), pushes them to the
 * `events` BullMQ queue (jobId = event id ⇒ de-duplicated) and marks them published.
 */
@Injectable()
export class OutboxDispatcher implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('OutboxDispatcher');
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly outbox: OutboxService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.runsWorkers || this.config.isTest) return;
    this.queues.worker('events', async (job) => {
      const { id, type, payload } = job.data as OutboxRow;
      await this.outbox.dispatch(id, type, payload);
    }, { concurrency: 8 });
    this.timer = setInterval(() => void this.tick(), 750);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Drains synchronously without BullMQ (tests, and serverless where there is no worker process).
   * A failing event goes back to PENDING with exponential backoff and is marked FAILED after 5 attempts.
   */
  async drainInline(limit = 200): Promise<number> {
    const rows = await this.claim(limit);
    for (const row of rows) {
      try {
        await this.outbox.dispatch(row.id, row.type, row.payload);
      } catch (err) {
        const attempts = row.attempts + 1;
        const failed = attempts >= 5;
        this.logger.error(`Outbox ${row.type}#${row.id} failed (attempt ${attempts}): ${(err as Error).message}`);
        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: failed ? { status: 'FAILED', lastError: (err as Error).message.slice(0, 500) } : { status: 'PENDING', availableAt: new Date(Date.now() + 2 ** attempts * 5_000), lastError: (err as Error).message.slice(0, 500) },
        });
      }
    }
    return rows.length;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.claim(50);
      const queue = this.queues.queue('events');
      for (const row of rows) {
        await queue.add(row.type, row, { jobId: row.id, attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
      }
    } catch (err) {
      this.logger.error(`Outbox tick failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async claim(limit: number): Promise<OutboxRow[]> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, type, payload, attempts FROM outbox_events
        WHERE status = 'PENDING' AND "availableAt" <= now()
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED`;
      if (rows.length) {
        await tx.outboxEvent.updateMany({
          where: { id: { in: rows.map((r) => r.id) } },
          data: { status: 'PUBLISHED', publishedAt: new Date(), attempts: { increment: 1 } },
        });
      }
      return rows;
    });
  }
}
