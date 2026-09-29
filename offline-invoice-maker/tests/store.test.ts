import { describe, expect, it } from 'vitest';
import { emptyData, exportCsv, exportJson, importJson, load, save, KEY } from '../src/store';
import { renderInvoice } from '../src/render';

const sample = () => {
  const d = emptyData();
  d.settings.issuerName = '山田<b>商店</b>';
  d.settings.registrationNumber = 'T1234567890123';
  d.invoices.push({
    id: 'a', number: 'INV-1', issueDate: '2026-09-01', dueDate: '', clientName: '=SUM(A1)', note: '',
    lines: [{ name: '<img src=x onerror=alert(1)>', qty: 1, unitPrice: 1000, taxRate: 10 }], updatedAt: '',
  });
  return d;
};

describe('store', () => {
  it('エクスポート→インポートで往復できる', () => {
    const d = sample();
    expect(importJson(exportJson(d))).toEqual(d);
  });
  it('不正なJSONは拒否する', () => {
    expect(() => importJson('{"version":2}')).toThrow();
    expect(() => importJson('not json')).toThrow();
    expect(() => importJson('{"version":1,"invoices":[{"lines":[{"qty":-1,"unitPrice":1}]}]}')).toThrow();
    expect(() => importJson('{"version":1,"invoices":"x"}')).toThrow();
  });
  it('保存→再読込で復元、壊れたデータは初期化', () => {
    const d = sample();
    save(d, localStorage);
    expect(load(localStorage)).toEqual(d);
    localStorage.setItem(KEY, '{broken');
    expect(load(localStorage)).toEqual(emptyData());
  });
  it('CSVは数式インジェクションを無害化する', () => {
    const csv = exportCsv(sample(), () => 1100);
    expect(csv).toContain(`"'=SUM(A1)"`);
  });
  it('請求書HTMLはユーザー入力をエスケープする', () => {
    const d = sample();
    const html = renderInvoice(d.invoices[0]!, d.settings);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>商店');
    expect(html).toContain('&lt;img');
  });
});
