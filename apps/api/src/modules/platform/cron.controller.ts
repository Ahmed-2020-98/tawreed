import { Controller, ForbiddenException, Get, Headers } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../common/auth/decorators.js';
import { AppConfig } from '../../config/app-config.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';
import { MaintenanceService } from './maintenance.service.js';

/** Vercel Cron entry point (sends `Authorization: Bearer $CRON_SECRET`). */
@ApiExcludeController()
@Controller('internal')
export class CronController {
  constructor(
    private readonly config: AppConfig,
    private readonly crypto: CryptoService,
    private readonly maintenance: MaintenanceService,
  ) {}

  @Public()
  @Get('cron')
  run(@Headers('authorization') auth?: string) {
    const secret = this.config.env.CRON_SECRET;
    if (!secret || !auth || !this.crypto.safeEqual(auth, `Bearer ${secret}`)) throw new ForbiddenException();
    return this.maintenance.tick({ force: true });
  }
}
