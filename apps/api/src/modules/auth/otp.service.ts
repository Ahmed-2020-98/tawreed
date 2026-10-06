import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode, type OtpRequestResult } from '@tawreed/contracts';
import type { Locale } from '@tawreed/i18n';
import { AppError } from '../../common/http/app-error.js';
import { AppConfig } from '../../config/app-config.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';
import { RedisService } from '../../infrastructure/redis/redis.service.js';
import { SmsService } from '../../infrastructure/sms/sms.service.js';

export type OtpPurpose = 'login' | 'quote-accept' | 'delivery';

interface OtpState {
  hash: string;
  attempts: number;
}

const SMS_TEXT: Record<OtpPurpose, Record<Locale, string>> = {
  login: { ar: 'رمز الدخول إلى توريد: {code}. لا تشاركه مع أحد.', en: 'Your Tawreed sign-in code: {code}. Do not share it.' },
  'quote-accept': { ar: 'رمز اعتماد عرض السعر في توريد: {code}', en: 'Tawreed quotation approval code: {code}' },
  delivery: { ar: 'رمز استلام شحنتك من توريد: {code}. أعطه للسائق عند الاستلام فقط.', en: 'Your Tawreed delivery code: {code}. Share it with the driver on delivery only.' },
};

/** One-time codes stored hashed in Redis with TTL, attempt limits, resend cooldown and rate limits. */
@Injectable()
export class OtpService {
  constructor(
    private readonly config: AppConfig,
    private readonly redis: RedisService,
    private readonly crypto: CryptoService,
    private readonly sms: SmsService,
  ) {}

  private key(purpose: OtpPurpose, subject: string) {
    return `otp:${purpose}:${subject}`;
  }

  /** Generates + sends a code. `subject` is usually the phone (or a composite like phone:quotationId). */
  async issue(purpose: OtpPurpose, phone: string, opts: { subject?: string; locale?: Locale; ip?: string; send?: boolean } = {}): Promise<OtpRequestResult & { code: string }> {
    const { env } = this.config;
    const subject = opts.subject ?? phone;
    const cooldownKey = `${this.key(purpose, subject)}:cooldown`;
    const ttl = await this.redis.client.ttl(cooldownKey);
    if (ttl > 0) throw new AppError(ErrorCode.OTP_RESEND_TOO_SOON, HttpStatus.TOO_MANY_REQUESTS, { seconds: ttl });
    // A receiver's phone can legitimately get many delivery codes a day (one per shipment), so those are limited per shipment.
    if (purpose === 'delivery') await this.rateLimit(`otp:rl:delivery:${subject}`, 5, 60 * 60);
    else await this.rateLimit(`otp:rl:phone:${phone}`, 8, 15 * 60);
    if (opts.ip) await this.rateLimit(`otp:rl:ip:${opts.ip}`, 40, 15 * 60);

    const code = (this.config.isDev || this.config.isTest || this.config.isDemo) && env.DEV_FIXED_OTP ? env.DEV_FIXED_OTP : this.crypto.numericCode(6);
    const state: OtpState = { hash: this.crypto.sha256(`${subject}:${code}`), attempts: 0 };
    await this.redis.client
      .multi()
      .set(this.key(purpose, subject), JSON.stringify(state), 'EX', env.OTP_TTL_SECONDS)
      .set(cooldownKey, '1', 'EX', env.OTP_RESEND_SECONDS)
      .exec();
    if (opts.send !== false) {
      await this.sms.send(phone, SMS_TEXT[purpose][opts.locale ?? 'ar'].replace('{code}', code));
    }
    return {
      code,
      expiresInSeconds: env.OTP_TTL_SECONDS,
      resendInSeconds: env.OTP_RESEND_SECONDS,
      ...(this.config.isDev || this.config.isTest ? { devCode: code } : {}),
    };
  }

  /** Verifies and consumes the code. Throws OTP_* errors. */
  async verify(purpose: OtpPurpose, subject: string, code: string): Promise<void> {
    const key = this.key(purpose, subject);
    const raw = await this.redis.client.get(key);
    if (!raw) throw new AppError(ErrorCode.OTP_EXPIRED, HttpStatus.UNPROCESSABLE_ENTITY);
    const state = JSON.parse(raw) as OtpState;
    if (state.attempts >= this.config.env.OTP_MAX_ATTEMPTS) {
      await this.redis.client.del(key);
      throw new AppError(ErrorCode.OTP_TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!this.crypto.safeEqual(state.hash, this.crypto.sha256(`${subject}:${code}`))) {
      state.attempts += 1;
      const ttl = await this.redis.client.ttl(key);
      await this.redis.client.set(key, JSON.stringify(state), 'EX', Math.max(ttl, 1));
      throw new AppError(ErrorCode.OTP_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    await this.redis.client.del(key);
  }

  private async rateLimit(key: string, max: number, windowSeconds: number): Promise<void> {
    const count = await this.redis.client.incr(key);
    if (count === 1) await this.redis.client.expire(key, windowSeconds);
    if (count > max) throw new AppError(ErrorCode.RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS);
  }
}
