import { type CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

/**
 * Fixed-window, in-memory rate limiting per route + client IP (same semantics as @nestjs/throttler's default
 * storage, which is CommonJS and can't load the ESM-only Nest 12 on serverless runtimes).
 */
export interface ThrottleLimit {
  ttl: number;
  limit: number;
}

const THROTTLE = 'tw:throttle';
const DEFAULT_LIMIT: ThrottleLimit = { ttl: 60_000, limit: 300 };

/** Overrides the default limit (300 requests / minute) for a route or controller. */
export const Throttle = (opts: { default: ThrottleLimit }) => SetMetadata(THROTTLE, opts.default);

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const limit = this.reflector.getAllAndOverride<ThrottleLimit | undefined>(THROTTLE, [context.getHandler(), context.getClass()]) ?? DEFAULT_LIMIT;
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const now = Date.now();
    const key = `${context.getClass().name}.${context.getHandler().name}:${req.ip ?? 'unknown'}`;

    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + limit.ttl };
      this.hits.set(key, entry);
      if (this.hits.size > 10_000) this.sweep(now);
    }
    entry.count++;
    res.setHeader('X-RateLimit-Limit', String(limit.limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit.limit - entry.count)));
    if (entry.count > limit.limit) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}
