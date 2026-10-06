import { deliverySlots, earliestDeliveryDate, isValidSlot } from './delivery.js';

// 2026-09-28 is a Monday. Times are UTC; Riyadh is UTC+3.
const mondayMorning = new Date('2026-09-28T06:00:00Z'); // 09:00 Riyadh
const mondayEvening = new Date('2026-09-28T15:00:00Z'); // 18:00 Riyadh
const thursdayEvening = new Date('2026-10-01T15:00:00Z'); // Thu 18:00 Riyadh

const fmt = (d: Date) => d.toISOString().slice(0, 10);

describe('earliestDeliveryDate', () => {
  it('allows same day before cutoff', () => {
    expect(fmt(earliestDeliveryDate({ leadTimeDays: 1, sameDayAvailable: true, cutoffTime: '14:00' }, mondayMorning))).toBe('2026-09-28');
  });
  it('rolls to next day after cutoff', () => {
    const d = earliestDeliveryDate({ leadTimeDays: 1, sameDayAvailable: true, cutoffTime: '14:00' }, mondayEvening);
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(d)).toBe('2026-09-29');
  });
  it('skips Friday', () => {
    const d = earliestDeliveryDate({ leadTimeDays: 1, sameDayAvailable: false }, thursdayEvening);
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(d)).toBe('2026-10-03');
  });
});

describe('deliverySlots', () => {
  it('returns bookable windows and never Fridays', () => {
    const slots = deliverySlots({ leadTimeDays: 1, sameDayAvailable: false }, 7, mondayEvening);
    expect(slots).toHaveLength(7);
    for (const s of slots) expect(new Date(`${s.date}T12:00:00+03:00`).getUTCDay()).not.toBe(5);
    expect(slots[0]?.windows).toEqual(['MORNING', 'AFTERNOON', 'EVENING']);
    expect(isValidSlot({ leadTimeDays: 1, sameDayAvailable: false }, slots[0]!.date, 'MORNING', mondayEvening)).toBe(true);
    expect(isValidSlot({ leadTimeDays: 1, sameDayAvailable: false }, '2026-09-28', 'MORNING', mondayEvening)).toBe(false);
  });
  it('limits same-day windows to those at least 2 hours away', () => {
    const slots = deliverySlots({ leadTimeDays: 1, sameDayAvailable: true, cutoffTime: '14:00' }, 3, mondayMorning);
    expect(slots[0]?.date).toBe('2026-09-28');
    expect(slots[0]?.windows).toEqual(['AFTERNOON', 'EVENING']);
  });
});
