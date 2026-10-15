import { toHalfWidth } from './date';

/** 金額文字列を整数(円)に正規化する。負数・小数・不正は null。 */
export function normalizeAmount(input: string): number | null {
  const s = toHalfWidth(input).replace(/[¥￥円,\s]/g, '');
  if (!/^\d{1,13}$/.test(s)) return null;
  return Number(s);
}
