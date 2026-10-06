import { TZDate } from '@date-fns/tz';
import { addDays, format } from 'date-fns';
import type { DeliveryWindow } from '@tawreed/contracts';

const TZ = 'Asia/Riyadh';
const WINDOWS: { window: DeliveryWindow; startHour: number }[] = [
  { window: 'MORNING', startHour: 8 },
  { window: 'AFTERNOON', startHour: 12 },
  { window: 'EVENING', startHour: 16 },
];
/** No deliveries on Friday (Saudi weekend day for most B2B operations). */
const isDeliveryDay = (d: Date) => d.getDay() !== 5;

export interface CoverageRules {
  leadTimeDays: number;
  sameDayAvailable: boolean;
  cutoffTime?: string | null;
}

export interface DeliverySlot {
  date: string;
  windows: DeliveryWindow[];
}

/** Earliest date the supplier can deliver (Riyadh time), honouring same-day cutoff; lead time counts delivery days. */
export function earliestDeliveryDate(rules: CoverageRules, now: Date = new Date()): Date {
  const local = new TZDate(now, TZ);
  let day = new TZDate(local.getFullYear(), local.getMonth(), local.getDate(), TZ);
  const [ch = 14, cm = 0] = (rules.cutoffTime ?? '14:00').split(':').map(Number);
  const beforeCutoff = local.getHours() * 60 + local.getMinutes() < ch * 60 + cm;
  if (rules.sameDayAvailable && beforeCutoff && isDeliveryDay(day)) return day;
  let remaining = Math.max(1, rules.leadTimeDays);
  while (remaining > 0) {
    day = new TZDate(addDays(day, 1), TZ);
    if (isDeliveryDay(day)) remaining -= 1;
  }
  return day;
}

/** Next `count` delivery dates with windows still bookable (same-day windows need a 2h buffer). */
export function deliverySlots(rules: CoverageRules, count = 7, now: Date = new Date()): DeliverySlot[] {
  const local = new TZDate(now, TZ);
  const todayKey = format(local, 'yyyy-MM-dd');
  const slots: DeliverySlot[] = [];
  let day = earliestDeliveryDate(rules, now);
  let guard = 0;
  while (slots.length < count && guard++ < 30) {
    if (isDeliveryDay(day)) {
      const key = format(day, 'yyyy-MM-dd');
      const windows = WINDOWS.filter((w) => key !== todayKey || w.startHour > local.getHours() + 2).map((w) => w.window);
      if (windows.length) slots.push({ date: key, windows });
    }
    day = new TZDate(addDays(day, 1), TZ);
  }
  return slots;
}

export function isValidSlot(rules: CoverageRules, date: string, window: DeliveryWindow, now: Date = new Date()): boolean {
  return deliverySlots(rules, 14, now).some((s) => s.date === date && s.windows.includes(window));
}
