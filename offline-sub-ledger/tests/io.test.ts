import { describe, expect, it } from 'vitest';
import { csvCell, exportCsv, exportJson, importJson } from '../src/core/io';
import { validateSubscription } from '../src/core/validate';
import type { Subscription } from '../src/core/model';

const s: Subscription = { id: 'i1', name: 'Netflix, "Std"', amount: 1490, cycle: 'monthly', nextBilling: '2026-03-01', category: '動画', note: 'a\nb', active: true };
let n = 0;
const id = () => 'new' + n++;

describe('json roundtrip', () => {
  it('roundtrips', () => {
    const r = importJson(exportJson([s]), id);
    expect(r).toEqual({ ok: true, items: [s] });
  });
  it('rejects garbage', () => {
    expect(importJson('not json', id).ok).toBe(false);
    expect(importJson('{"format":"other","items":[]}', id).ok).toBe(false);
    expect(importJson('null', id).ok).toBe(false);
  });
  it('rejects invalid item and names index', () => {
    const bad = JSON.stringify({ format: 'offline-sub-ledger', items: [s, { ...s, amount: -1 }] });
    const r = importJson(bad, id);
    expect(r.ok === false && r.error).toContain('2件目');
  });
  it('assigns id when missing', () => {
    const { id: _omit, ...noId } = s;
    const r = importJson(JSON.stringify({ format: 'offline-sub-ledger', items: [noId] }), id);
    expect(r.ok && r.items[0].id).toMatch(/^new/);
  });
});
describe('validate', () => {
  it('checks fields', () => {
    expect(validateSubscription({ ...s })).toBeNull();
    expect(validateSubscription({ ...s, name: '  ' })).toBeTruthy();
    expect(validateSubscription({ ...s, amount: 1.5 })).toBeTruthy();
    expect(validateSubscription({ ...s, amount: NaN })).toBeTruthy();
    expect(validateSubscription({ ...s, nextBilling: '2026-02-30' })).toBeTruthy();
    expect(validateSubscription({ ...s, cycle: 'daily' })).toBeTruthy();
    expect(validateSubscription('x')).toBeTruthy();
  });
});
describe('csv', () => {
  it('escapes and guards formulas', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('q"q')).toBe('"q""q"');
    expect(csvCell(-5)).toBe('-5');
    expect(exportCsv([s])).toContain('"Netflix, ""Std"""');
  });
});
