import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppConfig } from '../../config/app-config.js';
import { type Prisma, PrismaClient } from '../../generated/prisma/client.js';

export type Tx = Prisma.TransactionClient;
export type Db = PrismaService | Tx;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfig) {
    super({
      adapter: new PrismaPg({ connectionString: config.env.DATABASE_URL, ...(config.env.DB_POOL_MAX ? { max: config.env.DB_POOL_MAX } : {}) }),
      log: config.env.LOG_LEVEL === 'trace' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Interactive transaction with sensible defaults for business writes. */
  tx<T>(fn: (tx: Tx) => Promise<T>, opts: { timeout?: number } = {}): Promise<T> {
    return this.$transaction(fn, { timeout: opts.timeout ?? 15_000, maxWait: 5_000 });
  }
}
