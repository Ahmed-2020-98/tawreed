/**
 * ZATCA Phase-1 (simplified) QR: TLV (tag, length, value) of UTF-8 fields, base64-encoded.
 *  1 seller name · 2 VAT number · 3 timestamp (ISO 8601) · 4 invoice total incl. VAT · 5 VAT total
 */
export interface ZatcaQrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: Date;
  total: string;
  vatTotal: string;
}

function tlv(tag: number, value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > 255) throw new Error(`ZATCA TLV value too long for tag ${tag}`);
  return Buffer.concat([Buffer.from([tag, bytes.length]), bytes]);
}

export function zatcaQr(fields: ZatcaQrFields): string {
  return Buffer.concat([
    tlv(1, fields.sellerName),
    tlv(2, fields.vatNumber),
    tlv(3, fields.timestamp.toISOString()),
    tlv(4, fields.total),
    tlv(5, fields.vatTotal),
  ]).toString('base64');
}

export function decodeZatcaQr(b64: string): Record<number, string> {
  const buf = Buffer.from(b64, 'base64');
  const out: Record<number, string> = {};
  let i = 0;
  while (i < buf.length) {
    const tag = buf[i] ?? 0;
    const len = buf[i + 1] ?? 0;
    out[tag] = buf.subarray(i + 2, i + 2 + len).toString('utf8');
    i += 2 + len;
  }
  return out;
}
