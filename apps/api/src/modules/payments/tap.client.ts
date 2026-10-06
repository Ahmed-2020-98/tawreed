import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';

export interface TapCharge {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reference?: { transaction?: string; order?: string; gateway?: string; payment?: string };
  transaction?: { url?: string; created?: string | number };
  metadata?: Record<string, string>;
  response?: { code?: string; message?: string };
  source?: { payment_method?: string };
}

export interface TapResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/** Tap Payments v2 client (charges, refunds) + webhook `hashstring` verification. */
@Injectable()
export class TapClient {
  private readonly logger = new Logger('Tap');

  constructor(private readonly config: AppConfig) {}

  private async call<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown; lang?: 'ar' | 'en' }): Promise<TapResult<T>> {
    try {
      const res = await fetch(`${this.config.env.TAP_API_BASE}${path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${this.config.env.TAP_SECRET_KEY}`,
          'Content-Type': 'application/json',
          accept: 'application/json',
          ...(init.lang ? { lang_code: init.lang } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      const json = text ? (JSON.parse(text) as T & { errors?: { code?: string; description?: string }[] }) : null;
      const errors = (json as { errors?: { description?: string }[] } | null)?.errors;
      if (!res.ok || (errors && errors.length)) {
        const error = errors?.map((e) => e.description).join(' · ') ?? `HTTP ${res.status}`;
        this.logger.warn(`Tap ${init.method} ${path} failed: ${error}`);
        return { ok: false, status: res.status, data: null, error };
      }
      return { ok: true, status: res.status, data: json, error: null };
    } catch (err) {
      this.logger.warn(`Tap ${init.method} ${path} network error: ${(err as Error).message}`);
      return { ok: false, status: 0, data: null, error: (err as Error).message };
    }
  }

  createCharge(body: Record<string, unknown>, lang: 'ar' | 'en'): Promise<TapResult<TapCharge>> {
    return this.call<TapCharge>('/charges', { method: 'POST', body, lang });
  }

  retrieveCharge(id: string): Promise<TapResult<TapCharge>> {
    return this.call<TapCharge>(`/charges/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  createRefund(body: { charge_id: string; amount: number; currency: string; reason: string; reference?: { merchant: string } }): Promise<TapResult<{ id: string; status: string }>> {
    return this.call<{ id: string; status: string }>('/refunds', { method: 'POST', body });
  }

  /** Tap signs x_id…x_created with HMAC-SHA256(secret); amounts use the currency's decimals. */
  verifyWebhook(charge: TapCharge, received: string | undefined): boolean {
    if (!received) return false;
    const amount = Number(charge.amount ?? 0).toFixed(2);
    const input = [
      `x_id${charge.id ?? ''}`,
      `x_amount${amount}`,
      `x_currency${charge.currency ?? ''}`,
      `x_gateway_reference${charge.reference?.gateway ?? ''}`,
      `x_payment_reference${charge.reference?.payment ?? ''}`,
      `x_status${charge.status ?? ''}`,
      `x_created${charge.transaction?.created ?? ''}`,
    ].join('');
    const expected = createHmac('sha256', this.config.env.TAP_SECRET_KEY).update(input).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  static isPaid(status: string | undefined): boolean {
    return status === 'CAPTURED' || status === 'AUTHORIZED';
  }

  static isFinalFailure(status: string | undefined): boolean {
    return ['DECLINED', 'FAILED', 'CANCELLED', 'ABANDONED', 'VOID', 'TIMEDOUT', 'RESTRICTED', 'UNKNOWN'].includes(status ?? '');
  }
}
