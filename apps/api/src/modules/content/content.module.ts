import { Module } from '@nestjs/common';
import { ContentAdminService } from './content-admin.service.js';
import { AdminContentController, PublicContentController } from './content.controller.js';
import { ContentService } from './content.service.js';

@Module({ controllers: [PublicContentController, AdminContentController], providers: [ContentService, ContentAdminService], exports: [ContentService] })
export class ContentModule {}
