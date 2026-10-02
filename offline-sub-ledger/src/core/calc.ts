import type { Cycle, Subscription } from './model';

const PER_YEAR: Record<Cycle, number> = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 };

export function yearlyCost(s: Pick<Subscription, 'amount' | 'cycle'>): number {
  return s.amount * PER_YEAR[s.cycle];
}
export function monthlyCost(s: Pick<Subscription, 'amount' | 'cycle'>): number {
  return Math.round(yearlyCost(s) / 12);
}

export function totals(subs: Subscription[]): { monthly: number; yearly: number; count: number } {
  const active = subs.filter((s) => s.active);
  return {
    monthly: Math.round(active.reduce((a, s) => a + yearlyCost(s), 0) / 12),
    yearly: active.reduce((a, s) => a + yearlyCost(s), 0),
    count: active.length,
  };
}

function parse(d: string): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number);
  return [y, m, day];
}
function fmt(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 次回請求日を1周期進める。月末は存在する日にクランプ（1/31 → 2/28）。 */
export function advanceDate(date: string, cycle: Cycle, originalDay?: number): string {
  const [y, m, d] = parse(date);
  if (cycle === 'weekly') {
    const t = new Date(Date.UTC(y, m - 1, d + 7));
    return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  const add = cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12;
  const total = y * 12 + (m - 1) + add;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const want = originalDay ?? d;
  return fmt(ny, nm, Math.min(want, daysInMonth(ny, nm)));
}

/** 次回請求日が today より前なら、today 以降になるまで進める */
export function rollForward(date: string, cycle: Cycle, today: string): string {
  let cur = date;
  const day = parse(date)[2];
  let guard = 0;
  while (cur < today && guard++ < 10000) cur = advanceDate(cur, cycle, day);
  return cur;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = parse(a);
  const [by, bm, bd] = parse(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function upcoming(subs: Subscription[], today: string, withinDays: number): Subscription[] {
  return subs
    .filter((s) => s.active)
    .map((s) => ({ ...s, nextBilling: rollForward(s.nextBilling, s.cycle, today) }))
    .filter((s) => daysBetween(today, s.nextBilling) <= withinDays)
    .sort((a, b) => a.nextBilling.localeCompare(b.nextBilling));
}
