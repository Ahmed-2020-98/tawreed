import { Module } from '@nestjs/common';
import { KybController } from './kyb.controller.js';
import { KybService } from './kyb.service.js';

@Module({ controllers: [KybController], providers: [KybService], exports: [KybService] })
export class KybModule {}
