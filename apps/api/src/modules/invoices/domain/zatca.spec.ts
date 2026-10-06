import { decodeZatcaQr, zatcaQr } from './zatca.js';

describe('zatcaQr', () => {
  it('encodes Arabic seller names as TLV and round-trips', () => {
    const b64 = zatcaQr({ sellerName: 'شركة الواحة للمواد الغذائية', vatNumber: '310122393500003', timestamp: new Date('2026-09-28T10:00:00Z'), total: '425500.00', vatTotal: '55500.00' });
    const decoded = decodeZatcaQr(b64);
    expect(decoded[1]).toBe('شركة الواحة للمواد الغذائية');
    expect(decoded[2]).toBe('310122393500003');
    expect(decoded[3]).toBe('2026-09-28T10:00:00.000Z');
    expect(decoded[4]).toBe('425500.00');
    expect(decoded[5]).toBe('55500.00');
  });
});
