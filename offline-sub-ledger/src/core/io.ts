import { MAX_ITEMS, type Subscription } from './model';
import { normalize, validateSubscription } from './validate';

export const FORMAT = 'offline-sub-ledger';

export function exportJson(subs: Subscription[]): string {
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), items: subs }, null, 2);
}

export type ImportResult = { ok: true; items: Subscription[] } | { ok: false; error: string };

export function importJson(text: string, newId: () => string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSONとして読み込めません' };
  }
  const obj = data as { format?: unknown; items?: unknown };
  if (!obj || obj.format !== FORMAT || !Array.isArray(obj.items)) return { ok: false, error: 'このアプリのバックアップ形式ではありません' };
  if (obj.items.length > MAX_ITEMS) return { ok: false, error: `件数が上限(${MAX_ITEMS})を超えています` };
  const items: Subscription[] = [];
  for (let i = 0; i < obj.items.length; i++) {
    const it = obj.items[i] as Record<string, unknown>;
    const err = validateSubscription(it);
    if (err) return { ok: false, error: `${i + 1}件目: ${err}` };
    const id = typeof it.id === 'string' && it.id ? it.id.slice(0, 64) : newId();
    items.push(normalize(it, id));
  }
  return { ok: true, items };
}

/** CSVインジェクション対策: 先頭が = + - @ タブ CR の場合は ' を付与 */
export function csvCell(v: string | number | boolean): string {
  let s = String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(subs: Subscription[]): string {
  const head = ['name', 'amount', 'cycle', 'nextBilling', 'category', 'note', 'active'];
  const rows = subs.map((s) => [s.name, s.amount, s.cycle, s.nextBilling, s.category, s.note, s.active].map(csvCell).join(','));
  return '﻿' + [head.join(','), ...rows].join('\r\n') + '\r\n';
}
