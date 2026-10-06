import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { notificationPrefsSchema, notificationQuery, paginationQuery, registerDeviceSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { Paginated } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly n: NotificationsService) {}

  @Get('notifications')
  async list(@CurrentActor() actor: Actor, @ZQuery(notificationQuery) q: z.output<typeof notificationQuery>) {
    const { data, meta } = await this.n.list(actor.userId, q.page, q.pageSize, q.unread === 'true');
    return new Paginated(data, meta);
  }

  @Get('notifications/unread-count')
  unread(@CurrentActor() actor: Actor) {
    return this.n.unreadCount(actor.userId);
  }

  @Post('notifications/:id/read')
  read(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.n.markRead(actor.userId, id);
  }

  @Post('notifications/read-all')
  readAll(@CurrentActor() actor: Actor) {
    return this.n.markRead(actor.userId);
  }

  @Post('devices')
  register(@CurrentActor() actor: Actor, @ZBody(registerDeviceSchema) body: z.output<typeof registerDeviceSchema>) {
    return this.n.registerDevice(actor.userId, body.token, body.platform, body.app);
  }

  @Delete('devices')
  remove(@CurrentActor() actor: Actor, @Query('token') token: string) {
    return this.n.removeDevice(actor.userId, token);
  }

  @Get('notifications/preferences')
  prefs(@CurrentActor() actor: Actor) {
    return this.n.prefs(actor.userId);
  }

  @Put('notifications/preferences')
  savePrefs(@CurrentActor() actor: Actor, @ZBody(notificationPrefsSchema) body: z.output<typeof notificationPrefsSchema>) {
    return this.n.savePrefs(actor.userId, body);
  }

  @Auth('STAFF', 'admin.settings.manage')
  @Get('admin/notifications/deliveries')
  async deliveries(@ZQuery(paginationQuery) q: z.output<typeof paginationQuery>) {
    const { data, meta } = await this.n.deliveryLog(q.page, q.pageSize);
    return new Paginated(data, meta);
  }
}
