import { Injectable } from '@nestjs/common';
import { TZDate } from '@date-fns/tz';
import type { Tx } from '../prisma/prisma.service.js';

export type SequencePrefix = 'TW' | 'RFQ' | 'QT' | 'SH' | 'INV' | 'CN' | 'PAY' | 'STL' | 'DSP' | 'TCK';

/**
 * Gapless, human-readable document numbers (TW-2026-000123). The counter row is locked by the
 * upsert inside the caller's transaction, so a rollback releases the number.
 */
@Injectable()
export class SequenceService {
  async next(tx: Tx, prefix: SequencePrefix, pad = 6): Promise<string> {
    const year = new TZDate(Date.now(), 'Asia/Riyadh').getFullYear();
    const key = `${prefix}-${year}`;
    const rows = await tx.$queryRaw<{ value: number }[]>`
      INSERT INTO document_sequences ("key", "value", "updatedAt") VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET "value" = document_sequences."value" + 1, "updatedAt" = now()
      RETURNING "value"`;
    const value = rows[0]?.value ?? 1;
    return `${key}-${String(value).padStart(pad, '0')}`;
  }
}
