import { Global, Module } from '@nestjs/common';
import { AccessTokenService } from '../common/auth/access-token.service.js';
import { AppConfig } from '../config/app-config.js';
import { AuditService } from './audit/audit.service.js';
import { CryptoService } from './crypto/crypto.service.js';
import { JwtService } from './crypto/jwt.service.js';
import { IdempotencyService } from './idempotency/idempotency.service.js';
import { MailService } from './mail/mail.service.js';
import { OutboxDispatcher } from './outbox/outbox.dispatcher.js';
import { OutboxService } from './outbox/outbox.service.js';
import { PdfService } from './pdf/pdf.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { PushService } from './push/push.service.js';
import { QueueService } from './queue/queue.service.js';
import { RedisService } from './redis/redis.service.js';
import { SequenceService } from './sequences/sequence.service.js';
import { SmsService } from './sms/sms.service.js';
import { StorageService } from './storage/storage.service.js';

const providers = [
  AppConfig,
  PrismaService,
  RedisService,
  CryptoService,
  JwtService,
  AccessTokenService,
  SequenceService,
  AuditService,
  OutboxService,
  OutboxDispatcher,
  QueueService,
  StorageService,
  MailService,
  SmsService,
  PushService,
  PdfService,
  IdempotencyService,
];

@Global()
@Module({ providers, exports: providers })
export class InfrastructureModule {}
