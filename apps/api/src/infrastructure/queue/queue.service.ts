import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { type Job, Queue, Worker, type WorkerOptions } from 'bullmq';
import { AppConfig } from '../../config/app-config.js';
import { RedisService } from '../redis/redis.service.js';

export type QueueName = 'events' | 'notifications' | 'documents' | 'scheduled';

/** Minimal BullMQ wrapper honouring APP_ROLE (workers only start in worker/all roles). */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger('Queues');
  private readonly queues = new Map<QueueName, Queue>();
  private readonly workers: Worker[] = [];
  /** Derived from REDIS_PREFIX so dev (`tw-bull`) and test (`tw-test-bull`) never share queues. */
  private readonly prefix: string;

  constructor(
    private readonly config: AppConfig,
    private readonly redis: RedisService,
  ) {
    this.prefix = `${config.env.REDIS_PREFIX.replace(/:$/, '')}-bull`;
  }

  queue(name: QueueName): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.redis.createConnection(),
        prefix: this.prefix,
        defaultJobOptions: { removeOnComplete: 500, removeOnFail: 1000 },
      });
      this.queues.set(name, q);
    }
    return q;
  }

  worker(name: QueueName, processor: (job: Job) => Promise<unknown>, opts: Partial<WorkerOptions> = {}): void {
    if (!this.config.runsWorkers) return;
    const worker = new Worker(name, processor, {
      connection: this.redis.createConnection(),
      prefix: this.prefix,
      concurrency: 4,
      ...opts,
    });
    worker.on('failed', (job, err) => this.logger.warn(`[${name}] job ${job?.name}#${job?.id} failed: ${err.message}`));
    this.workers.push(worker);
  }

  /** Idempotent cron schedule (BullMQ job scheduler), evaluated in Asia/Riyadh. */
  async schedule(name: QueueName, id: string, pattern: string, data: Record<string, unknown> = {}): Promise<void> {
    await this.queue(name).upsertJobScheduler(id, { pattern, tz: 'Asia/Riyadh' }, { name: id, data });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.workers.map((w) => w.close()));
    await Promise.allSettled([...this.queues.values()].map((q) => q.close()));
  }
}
