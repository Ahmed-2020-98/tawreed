import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Redis, type RedisOptions } from 'ioredis';
import { AppConfig } from '../../config/app-config.js';
import { type KvClient, PgKv } from './pg-kv.js';

/**
 * Shared key/value client (keys auto-prefixed with REDIS_PREFIX): ioredis, or the Postgres-backed PgKv when
 * KV_DRIVER=postgres (serverless). BullMQ gets its own un-prefixed Redis connections (Redis driver only).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  readonly client: KvClient;
  private readonly extra: Redis[] = [];

  constructor(private readonly config: AppConfig) {
    const { env } = config;
    if (env.KV_DRIVER === 'postgres') {
      this.client = new PgKv(env.DATABASE_URL, env.REDIS_PREFIX, env.DB_POOL_MAX ? Math.min(env.DB_POOL_MAX, 3) : 3);
      return;
    }
    const client = new Redis(env.REDIS_URL, { keyPrefix: env.REDIS_PREFIX, lazyConnect: false });
    client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    this.client = client;
  }

  /** New connection for BullMQ / pub-sub (no keyPrefix, BullMQ requires maxRetriesPerRequest=null). */
  createConnection(opts: RedisOptions = {}): Redis {
    if (this.config.env.KV_DRIVER === 'postgres') throw new Error('BullMQ needs Redis (KV_DRIVER=postgres has no queues)');
    const conn = new Redis(this.config.env.REDIS_URL, { maxRetriesPerRequest: null, ...opts });
    this.extra.push(conn);
    return conn;
  }

  /** Drops expired entries (Postgres driver only; Redis expires keys itself). */
  async purgeExpired(): Promise<number> {
    return this.client instanceof PgKv ? this.client.purgeExpired() : 0;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.client.quit(), ...this.extra.map((c) => c.quit())]);
  }
}
