import test from 'node:test';
import assert from 'node:assert/strict';
import { calcInvoice, withholdingTax, pct, itemsToCsv, csvToItems, validateRegNo } from '../src/core.mjs';

test('税率ごとに1回だけ端数処理', () => {
  const r = calcInvoice([
    { name: 'a', unitPrice: 333, qty: 1, rate: 10 },
    { name: 'b', unitPrice: 333, qty: 1, rate: 10 },
    { name: 'c', unitPrice: 101, qty: 1, rate: 8 },
  ]);
  assert.equal(r.byRate[0].tax, 66); // 666*10% = 66.6 -> 66
  assert.equal(r.byRate[1].tax, 8);  // 101*8% = 8.08
  assert.equal(r.total, 666 + 101 + 66 + 8);
});
test('端数処理モード', () => {
  assert.equal(pct(105, 10, 'floor'), 10);
  assert.equal(pct(105, 10, 'ceil'), 11);
  assert.equal(pct(105, 10, 'round'), 11);
  assert.throws(() => pct(1.5, 10));
});
test('源泉徴収', () => {
  assert.equal(withholdingTax(100000), 10210);
  assert.equal(withholdingTax(1000000), 102100);
  assert.equal(withholdingTax(1500000), 102100 + 102100);
  assert.equal(withholdingTax(0), 0);
  assert.throws(() => withholdingTax(-1));
});
test('源泉徴収あり請求', () => {
  const r = calcInvoice([{ name: 'x', unitPrice: 100000, qty: 1, rate: 10 }], { withholding: true });
  assert.equal(r.payable, 110000 - 10210);
});
test('異常系', () => {
  assert.throws(() => calcInvoice([{ name: 'x', unitPrice: 1, qty: 1, rate: 5 }]));
  assert.throws(() => calcInvoice([{ name: 'x', unitPrice: 1.5, qty: 1, rate: 10 }]));
  assert.throws(() => calcInvoice([{ name: 'x', unitPrice: 1, qty: -1, rate: 10 }]));
  assert.deepEqual(calcInvoice([]).total, 0);
});
test('巨大金額でも整数', () => {
  const r = calcInvoice([{ name: 'x', unitPrice: 1e9, qty: 1000, rate: 10 }]);
  assert.equal(r.tax, 1e11);
});
test('CSV往復（引用符・カンマ・改行）', () => {
  const items = [{ name: 'a,"b"\nc', unitPrice: 100, qty: 2, rate: 10 }, { name: 'やさい', unitPrice: 50, qty: 1, rate: 8 }];
  assert.deepEqual(csvToItems(itemsToCsv(items)), items);
  assert.throws(() => csvToItems('bad\n1'));
  assert.throws(() => csvToItems('name,unitPrice,qty,rate\nx,a,1,10'));
});
test('登録番号形式', () => {
  assert.equal(validateRegNo('T123').ok, false);
  assert.equal(validateRegNo('T1234567890123').ok, true);
});
