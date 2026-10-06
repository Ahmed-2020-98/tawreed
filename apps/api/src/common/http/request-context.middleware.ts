import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { resolveLocale } from '@tawreed/i18n';
import type { NextFunction, Request, Response } from 'express';
import { RequestContext } from '../context/request-context.js';

/** Opens the AsyncLocalStorage scope for the request (id, locale, ip, UA, device). */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers['x-request-id'];
    const requestId = typeof header === 'string' && header.length <= 100 ? header : randomUUID();
    res.setHeader('x-request-id', requestId);
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ?? req.socket.remoteAddress;
    const device = req.headers['x-device-id'];
    RequestContext.run(
      {
        requestId,
        locale: resolveLocale(req.headers['accept-language']),
        ip,
        userAgent: req.headers['user-agent'],
        deviceId: typeof device === 'string' ? device.slice(0, 120) : undefined,
      },
      next,
    );
  }
}
