import { Module } from '@nestjs/common';
import { CronController } from './cron.controller.js';
import { JobsService } from './jobs.service.js';
import { MaintenanceService } from './maintenance.service.js';
import { PlatformController } from './platform.controller.js';
import { PlatformService } from './platform.service.js';

@Module({ controllers: [PlatformController, CronController], providers: [PlatformService, JobsService, MaintenanceService], exports: [JobsService, MaintenanceService] })
export class PlatformModule {}
