import { Injectable, Logger } from '@nestjs/common';
import { OutboxDispatcher } from '../../infrastructure/outbox/outbox.dispatcher.js';
import { RedisService } from '../../infrastructure/redis/redis.service.js';
import { JobsService } from './jobs.service.js';

/** Recurring jobs and the minimum gap between runs (a Redis lock makes each run cluster-wide unique). */
const JOBS: { name: string; everySeconds: number; run: (jobs: JobsService, kv: RedisService) => Promise<unknown> }[] = [
  { name: 'kv-purge', everySeconds: 3600, run: (_j, kv) => kv.purgeExpired() },
  { name: 'supplier-sla', everySeconds: 300, run: (j) => j.supplierSla() },
  { name: 'deal-prices', everySeconds: 900, run: (j) => j.refreshDealPrices() },
  { name: 'expire-quotations', everySeconds: 3600, run: (j) => j.expireQuotations() },
  { name: 'auto-complete', everySeconds: 86_400, run: (j) => j.autoComplete() },
  { name: 'credit-collections', everySeconds: 86_400, run: (j) => j.creditCollections() },
];


/**
 * Serverless replacement for the worker process (outbox dispatcher + BullMQ schedulers).
 * `tick()` runs after each response (Vercel `waitUntil`): it drains due outbox events after writes (and at
 * least every 15 s otherwise, for delayed events), and starts recurring jobs whose interval has elapsed.
 * The daily Vercel Cron calls `tick({ force: true })` as a safety net when there is no traffic.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger('Maintenance');
  private lastDrain = 0;
  private lastJobsCheck = 0;

  constructor(
    private readonly outbox: OutboxDispatcher,
    private readonly redis: RedisService,
    private readonly jobs: JobsService,
  ) {}

  async tick(opts: { mutation?: boolean; force?: boolean } = {}): Promise<{ events: number; jobs: string[] }> {
    const now = Date.now();
    let events = 0;
    const ran: string[] = [];
    if (opts.force || opts.mutation || now - this.lastDrain > 15_000) {
      this.lastDrain = now;
      // Drain until empty (bounded): one delivery can publish follow-up events (e.g. delivered → invoice issued).
      for (let i = 0; i < 5; i++) {
        const n = await this.outbox.drainInline(50);
        events += n;
        if (n === 0) break;
      }
    }
    if (opts.force || now - this.lastJobsCheck > 60_000) {
      this.lastJobsCheck = now;
      for (const job of JOBS) {
        const acquired = await this.redis.client.set(`jobs:lock:${job.name}`, String(now), 'EX', job.everySeconds, 'NX');
        if (acquired !== 'OK') continue;
        try {
          await job.run(this.jobs, this.redis);
          ran.push(job.name);
        } catch (err) {
          this.logger.error(`Job ${job.name} failed: ${(err as Error).message}`);
        }
      }
    }
    return { events, jobs: ran };
  }
}
