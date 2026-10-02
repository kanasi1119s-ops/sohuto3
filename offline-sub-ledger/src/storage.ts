import type { Subscription } from './core/model';
import { importJson, exportJson } from './core/io';

const KEY = 'offline-sub-ledger:v1';

export function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

export function load(): Subscription[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const r = importJson(raw, newId);
    if (r.ok) return r.items;
    // 壊れたデータを上書きで失わないよう退避する
    localStorage.setItem(KEY + ':corrupt-backup', raw);
    return [];
  } catch {
    return [];
  }
}

/** 保存に失敗したら false（容量超過・プライベートモード等） */
export function save(subs: Subscription[]): boolean {
  try {
    localStorage.setItem(KEY, exportJson(subs));
    return true;
  } catch {
    return false;
  }
}
