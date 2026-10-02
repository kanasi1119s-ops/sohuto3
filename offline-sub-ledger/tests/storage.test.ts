import { beforeEach, describe, expect, it } from 'vitest';

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
beforeEach(() => { (globalThis as any).localStorage = new MemStorage(); });

describe('storage', () => {
  it('backs up corrupted data instead of silently losing it', async () => {
    const { load } = await import('../src/storage');
    localStorage.setItem('offline-sub-ledger:v1', '{broken');
    expect(load()).toEqual([]);
    expect(localStorage.getItem('offline-sub-ledger:v1:corrupt-backup')).toBe('{broken');
  });
  it('save reports failure when storage throws', async () => {
    const { save } = await import('../src/storage');
    (globalThis as any).localStorage = { setItem() { throw new Error('quota'); } };
    expect(save([])).toBe(false);
  });
  it('save/load roundtrip', async () => {
    const { save, load } = await import('../src/storage');
    const item = { id: '1', name: 'a', amount: 1, cycle: 'monthly' as const, nextBilling: '2026-01-01', category: '', note: '', active: true };
    expect(save([item])).toBe(true);
    expect(load()).toEqual([item]);
  });
});
