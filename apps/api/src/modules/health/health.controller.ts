import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/auth/decorators.js';
import { RawResponse } from '../../common/http/envelope.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { RedisService } from '../../infrastructure/redis/redis.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('live')
  live() {
    return new RawResponse({ status: 'ok' });
  }

  @Public()
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const [db, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis.client.ping().then((r) => r === 'PONG').catch(() => false),
    ]);
    const ok = db && redis;
    if (!ok) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return new RawResponse({ status: ok ? 'ok' : 'degraded', db, redis });
  }
}
