import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';

export interface SmsResult {
  ok: boolean;
  provider: string;
  error?: string;
}

/** SMS gateway facade. `log` provider prints messages (development); Unifonic/Taqnyat need credentials. */
@Injectable()
export class SmsService {
  private readonly logger = new Logger('SMS');

  constructor(private readonly config: AppConfig) {}

  async send(phone: string, message: string): Promise<SmsResult> {
    const provider = this.config.env.SMS_PROVIDER;
    try {
      if (provider === 'unifonic') return await this.unifonic(phone, message);
      if (provider === 'taqnyat') return await this.taqnyat(phone, message);
      this.logger.log(`[SMS → ${phone}] ${message}`);
      return { ok: true, provider: 'log' };
    } catch (err) {
      this.logger.warn(`SMS via ${provider} failed: ${(err as Error).message}`);
      return { ok: false, provider, error: (err as Error).message };
    }
  }

  private async unifonic(phone: string, message: string): Promise<SmsResult> {
    const appSid = this.config.env.UNIFONIC_APP_SID;
    if (!appSid) throw new Error('UNIFONIC_APP_SID is not set');
    const body = new URLSearchParams({ AppSid: appSid, Recipient: phone.replace('+', ''), Body: message });
    const res = await fetch('https://el.cloud.unifonic.com/rest/SMS/messages', { method: 'POST', body });
    if (!res.ok) throw new Error(`Unifonic HTTP ${res.status}`);
    return { ok: true, provider: 'unifonic' };
  }

  private async taqnyat(phone: string, message: string): Promise<SmsResult> {
    const token = this.config.env.TAQNYAT_BEARER_TOKEN;
    if (!token) throw new Error('TAQNYAT_BEARER_TOKEN is not set');
    const res = await fetch('https://api.taqnyat.sa/v1/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients: [phone.replace('+', '')], body: message, sender: this.config.env.TAQNYAT_SENDER }),
    });
    if (!res.ok) throw new Error(`Taqnyat HTTP ${res.status}`);
    return { ok: true, provider: 'taqnyat' };
  }
}
