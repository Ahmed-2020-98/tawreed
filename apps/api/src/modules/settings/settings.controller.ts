import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PublicSettingsDto } from '@tawreed/contracts';
import { Auth, CurrentActor, Public } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { SETTINGS_DEFAULTS, type SettingsKey } from './settings.defaults.js';
import { SettingsService } from './settings.service.js';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('public/settings')
  publicSettings(): Promise<PublicSettingsDto> {
    return this.settings.publicSettings();
  }

  @ApiBearerAuth()
  @Auth('STAFF', 'admin.settings.manage')
  @Get('admin/settings')
  all() {
    return this.settings.getAll();
  }

  @ApiBearerAuth()
  @Auth('STAFF', 'admin.settings.manage')
  @Put('admin/settings/:key')
  update(@Param('key') key: string, @Body() body: Record<string, unknown>, @CurrentActor() actor: Actor) {
    if (!(key in SETTINGS_DEFAULTS) || typeof body !== 'object' || Array.isArray(body)) throw AppError.notFound();
    return this.settings.set(key as SettingsKey, body, actor.userId);
  }
}
