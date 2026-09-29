import { describe, expect, it } from 'vitest';
import { calcTotals, isValidRegistrationNumber, lineAmount, validateLine, withholdingTax, type Line } from '../src/calc';

const L = (qty: number, unitPrice: number, taxRate: 10 | 8 = 10): Line => ({ name: 'x', qty, unitPrice, taxRate });

describe('calc', () => {
  it('税率ごとに1回だけ端数処理する', () => {
    // 10%: 33+33+33=99 → 9.9 → 切り捨て9。行ごとに処理すると 3+3+3=9 で同じだが 四捨五入では差が出る
    const t = calcTotals([L(1, 33), L(1, 33), L(1, 33)], 'round', false);
    expect(t.byRate[0]).toEqual({ rate: 10, subtotal: 99, tax: 10 });
    expect(t.total).toBe(109);
  });
  it('8%と10%を分けて計算する', () => {
    const t = calcTotals([L(1, 1000), L(2, 500, 8)], 'floor', false);
    expect(t.byRate).toEqual([
      { rate: 10, subtotal: 1000, tax: 100 },
      { rate: 8, subtotal: 1000, tax: 80 },
    ]);
    expect(t.total).toBe(2180);
  });
  it('数量の小数を整数演算で扱う', () => {
    expect(lineAmount(L(0.1, 3), 'floor')).toBe(0);
    expect(lineAmount(L(1.5, 999), 'round')).toBe(1499); // 1498.5 → 1499
    expect(lineAmount(L(1.5, 999), 'floor')).toBe(1498);
    expect(lineAmount(L(1.5, 999), 'ceil')).toBe(1499);
  });
  it('源泉徴収: 100万円以下と超過', () => {
    expect(withholdingTax(100000)).toBe(10210);
    expect(withholdingTax(1000000)).toBe(102100);
    expect(withholdingTax(2000000)).toBe(102100 + 204200);
    expect(withholdingTax(0)).toBe(0);
  });
  it('源泉徴収を有効化すると差引額が出る', () => {
    const t = calcTotals([L(1, 100000)], 'floor', true);
    expect(t.withholding).toBe(10210);
    expect(t.payable).toBe(110000 - 10210);
  });
  it('明細なしは0円', () => {
    const t = calcTotals([], 'floor', false);
    expect(t.total).toBe(0);
    expect(t.byRate).toEqual([]);
  });
  it('入力検証', () => {
    expect(validateLine(L(1, 100))).toBeNull();
    expect(validateLine(L(-1, 100))).not.toBeNull();
    expect(validateLine(L(1, 1.5))).not.toBeNull();
    expect(validateLine(L(NaN, 100))).not.toBeNull();
    expect(validateLine(L(0.0001, 100))).not.toBeNull();
    expect(validateLine(L(1e9, 1e9))).not.toBeNull();
  });
  it('登録番号の形式', () => {
    expect(isValidRegistrationNumber('T1234567890123')).toBe(true);
    expect(isValidRegistrationNumber('1234567890123')).toBe(false);
    expect(isValidRegistrationNumber('T123')).toBe(false);
    expect(isValidRegistrationNumber('T12345678901234')).toBe(false);
  });
});
