export type TaxRate = 10 | 8;
export type Rounding = 'floor' | 'round' | 'ceil';

export interface Line {
  name: string;
  qty: number; // 小数3桁まで
  unitPrice: number; // 税抜・円
  taxRate: TaxRate;
}

export interface RateTotal {
  rate: TaxRate;
  subtotal: number;
  tax: number;
}

export interface Totals {
  lineAmounts: number[];
  byRate: RateTotal[];
  subtotal: number;
  tax: number;
  total: number;
  withholding: number;
  payable: number;
}

export const MAX_AMOUNT = 9_999_999_999_999; // 表示・演算の安全上限（円）

function applyRounding(numerator: number, denominator: number, mode: Rounding): number {
  // numerator, denominator はともに非負整数。浮動小数誤差を避けるため整数演算のみ。
  const q = Math.floor(numerator / denominator);
  const r = numerator - q * denominator;
  if (mode === 'floor' || r === 0) return q;
  if (mode === 'ceil') return q + 1;
  return r * 2 >= denominator ? q + 1 : q;
}

export function lineAmount(line: Line, mode: Rounding): number {
  const qtyMilli = Math.round(line.qty * 1000);
  return applyRounding(qtyMilli * line.unitPrice, 1000, mode);
}

/** 源泉徴収税額（報酬・料金等）。100万円以下 10.21%、超過分 20.42%。円未満切り捨て。 */
export function withholdingTax(base: number): number {
  const limit = 1_000_000;
  if (base <= limit) return Math.floor((base * 1021) / 10000);
  return Math.floor((limit * 1021) / 10000) + Math.floor(((base - limit) * 2042) / 10000);
}

export function validateLine(line: Line): string | null {
  if (!Number.isFinite(line.qty) || line.qty < 0) return '数量は0以上の数値で入力してください';
  if (Math.abs(line.qty * 1000 - Math.round(line.qty * 1000)) > 1e-6) return '数量は小数第3位までです';
  if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) return '単価は0以上の整数（円）で入力してください';
  if (line.taxRate !== 10 && line.taxRate !== 8) return '税率は10%または8%です';
  if (line.qty * line.unitPrice > MAX_AMOUNT) return '金額が上限を超えています';
  return null;
}

/**
 * 適格請求書の端数処理: 税率ごとに合計した税抜金額に対し、1請求書につき税率ごと1回だけ端数処理する。
 */
export function calcTotals(lines: Line[], mode: Rounding, withholdingEnabled: boolean): Totals {
  const lineAmounts = lines.map((l) => lineAmount(l, mode));
  const byRate: RateTotal[] = ([10, 8] as TaxRate[])
    .map((rate) => {
      const subtotal = lines.reduce((s, l, i) => s + (l.taxRate === rate ? (lineAmounts[i] ?? 0) : 0), 0);
      return { rate, subtotal, tax: applyRounding(subtotal * rate, 100, mode) };
    })
    .filter((r) => r.subtotal > 0 || lines.some((l) => l.taxRate === r.rate));
  const subtotal = byRate.reduce((s, r) => s + r.subtotal, 0);
  const tax = byRate.reduce((s, r) => s + r.tax, 0);
  const total = subtotal + tax;
  const withholding = withholdingEnabled ? withholdingTax(subtotal) : 0;
  return { lineAmounts, byRate, subtotal, tax, total, withholding, payable: total - withholding };
}

export function isValidRegistrationNumber(v: string): boolean {
  return /^T\d{13}$/.test(v);
}

export const yen = (n: number): string => `¥${n.toLocaleString('ja-JP')}`;
