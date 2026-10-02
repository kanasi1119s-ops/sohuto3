import { CYCLES, MAX_AMOUNT, MAX_NAME, type Cycle, type Subscription } from './model';

export function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** 不正なら理由文字列、正常なら null */
export function validateSubscription(x: unknown): string | null {
  if (typeof x !== 'object' || x === null) return '形式が不正です';
  const s = x as Record<string, unknown>;
  if (typeof s.name !== 'string' || s.name.trim() === '') return '名前は必須です';
  if (s.name.length > MAX_NAME) return `名前は${MAX_NAME}文字以内です`;
  if (typeof s.amount !== 'number' || !Number.isInteger(s.amount) || s.amount < 0 || s.amount > MAX_AMOUNT)
    return `金額は0〜${MAX_AMOUNT}の整数で入力してください`;
  if (!CYCLES.includes(s.cycle as Cycle)) return '周期が不正です';
  if (!isValidDate(s.nextBilling)) return '次回請求日が不正です';
  if (s.category !== undefined && typeof s.category !== 'string') return 'カテゴリが不正です';
  if (s.note !== undefined && typeof s.note !== 'string') return 'メモが不正です';
  return null;
}

export function normalize(x: Record<string, unknown>, id: string): Subscription {
  return {
    id,
    name: String(x.name).trim(),
    amount: x.amount as number,
    cycle: x.cycle as Cycle,
    nextBilling: x.nextBilling as string,
    category: typeof x.category === 'string' ? x.category.trim().slice(0, 50) : '',
    note: typeof x.note === 'string' ? x.note.slice(0, 500) : '',
    active: x.active === false ? false : true,
  };
}
