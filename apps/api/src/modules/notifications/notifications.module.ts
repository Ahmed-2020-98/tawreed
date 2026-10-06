import { Global, Module } from '@nestjs/common';
import { NotificationHandlers } from './notification.handlers.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Global()
@Module({ controllers: [NotificationsController], providers: [NotificationsService, NotificationHandlers], exports: [NotificationsService] })
export class NotificationsModule {}
