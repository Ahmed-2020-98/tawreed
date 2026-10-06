import { Global, Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';

// Serverless hosts can't keep sockets open: without the gateway RealtimeService.emit() is a no-op and clients poll.
const gatewayEnabled = !['0', 'false', 'no', 'off'].includes((process.env.REALTIME_ENABLED ?? 'true').toLowerCase());

@Global()
@Module({ controllers: [RealtimeController], providers: [RealtimeService, ...(gatewayEnabled ? [RealtimeGateway] : [])], exports: [RealtimeService] })
export class RealtimeModule {}
