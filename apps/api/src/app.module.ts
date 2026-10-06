import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './common/auth/auth.guard.js';
import { EnvelopeInterceptor } from './common/http/envelope.js';
import { AllExceptionsFilter } from './common/http/error.filter.js';
import { ThrottleGuard } from './common/http/throttle.js';
import { RequestContextMiddleware } from './common/http/request-context.middleware.js';
import { InfrastructureModule } from './infrastructure/infrastructure.module.js';
import { FEATURE_MODULES } from './modules/index.js';

@Module({
  imports: [
    InfrastructureModule,
    ...FEATURE_MODULES,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottleGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('{*path}');
  }
}
