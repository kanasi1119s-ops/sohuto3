import { describe, expect, it } from 'vitest';
import { advanceDate, daysBetween, monthlyCost, rollForward, totals, upcoming, yearlyCost } from '../src/core/calc';
import type { Subscription } from '../src/core/model';

const sub = (o: Partial<Subscription>): Subscription => ({ id: 'a', name: 'x', amount: 1000, cycle: 'monthly', nextBilling: '2026-01-15', category: '', note: '', active: true, ...o });

describe('cost', () => {
  it('converts cycles', () => {
    expect(yearlyCost(sub({ cycle: 'weekly' }))).toBe(52000);
    expect(monthlyCost(sub({ cycle: 'yearly', amount: 12000 }))).toBe(1000);
    expect(monthlyCost(sub({ cycle: 'quarterly', amount: 3000 }))).toBe(1000);
  });
  it('totals ignore inactive', () => {
    expect(totals([sub({}), sub({ active: false })])).toEqual({ monthly: 1000, yearly: 12000, count: 1 });
    expect(totals([])).toEqual({ monthly: 0, yearly: 0, count: 0 });
  });
});
describe('dates', () => {
  it('clamps month end', () => {
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(advanceDate('2028-01-31', 'monthly')).toBe('2028-02-29');
    expect(advanceDate('2024-02-29', 'yearly')).toBe('2025-02-28');
  });
  it('crosses year', () => {
    expect(advanceDate('2026-12-15', 'monthly')).toBe('2027-01-15');
    expect(advanceDate('2026-11-30', 'quarterly')).toBe('2027-02-28');
    expect(advanceDate('2026-12-28', 'weekly')).toBe('2027-01-04');
  });
  it('rollForward keeps original day', () => {
    expect(rollForward('2026-01-31', 'monthly', '2026-03-01')).toBe('2026-03-31');
    expect(rollForward('2026-05-01', 'monthly', '2026-03-01')).toBe('2026-05-01');
  });
  it('daysBetween', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });
  it('upcoming', () => {
    const r = upcoming([sub({ nextBilling: '2026-03-03' }), sub({ id: 'b', nextBilling: '2026-03-20' }), sub({ id: 'c', nextBilling: '2026-03-02', active: false })], '2026-03-01', 7);
    expect(r.map((s) => s.id)).toEqual(['a']);
  });
});
