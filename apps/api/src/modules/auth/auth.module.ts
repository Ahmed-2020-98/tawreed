import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ContextService } from './context.service.js';
import { OtpService } from './otp.service.js';
import { SessionService } from './session.service.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, OtpService, SessionService, ContextService],
  exports: [OtpService, SessionService, AuthService],
})
export class AuthModule {}
