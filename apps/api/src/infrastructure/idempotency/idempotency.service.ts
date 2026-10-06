import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode } from '@tawreed/contracts';
import { AppError } from '../../common/http/app-error.js';
import { RedisService } from '../redis/redis.service.js';

const IN_FLIGHT = '__in_flight__';

/**
 * Idempotency-Key support: the first request with a key runs, concurrent duplicates get 409,
 * later duplicates (within 24h) replay the stored result.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  async run<T>(scope: string, key: string | undefined, fn: () => Promise<T>): Promise<T> {
    if (!key) return fn();
    if (!/^[\w-]{8,100}$/.test(key)) throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED, {}, { fields: [{ path: 'Idempotency-Key', message: 'invalid' }] });
    const redisKey = `idem:${scope}:${key}`;
    const acquired = await this.redis.client.set(redisKey, IN_FLIGHT, 'EX', 120, 'NX');
    if (!acquired) {
      const existing = await this.redis.client.get(redisKey);
      if (existing && existing !== IN_FLIGHT) return JSON.parse(existing) as T;
      throw new AppError(ErrorCode.IDEMPOTENCY_CONFLICT, HttpStatus.CONFLICT);
    }
    try {
      const result = await fn();
      await this.redis.client.set(redisKey, JSON.stringify(result ?? null), 'EX', 86_400);
      return result;
    } catch (err) {
      await this.redis.client.del(redisKey);
      throw err;
    }
  }
}
