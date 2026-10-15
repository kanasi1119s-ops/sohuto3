import { describe, it, expect } from 'vitest';
import { normalizeDate } from '../../src/core/date';
import { normalizeAmount } from '../../src/core/amount';
import { buildName, dedupe, sanitizePart, getExt } from '../../src/core/name';
import { crc32 } from '../../src/core/crc32';
import { createZip } from '../../src/core/zip';
import { csvCell, toCsv, parseCsv } from '../../src/core/csv';
import { guessFromFilename } from '../../src/core/guess';
import { canonicalVendor, dictFromCsv, dictToCsv } from '../../src/core/dict';
import { resolveRows, ledgerCsv, type Row } from '../../src/core/rows';

describe('normalizeDate', () => {
  it.each([
    ['2026-10-15', '20261015'], ['2026/1/5', '20260105'], ['2026年10月15日', '20261015'],
    ['令和8年10月15日', '20261015'], ['R8.10.15', '20261015'], ['令和元年5月1日', '20190501'],
    ['２０２６－１０－１５', '20261015'], ['20261015', '20261015'], ['平成31年4月30日', '20190430'],
  ])('%s -> %s', (i, o) => expect(normalizeDate(i)).toBe(o));
  it.each(['', '2026-02-30', '2026-13-01', 'abc', '2025/2/29', '1800/1/1'])('rejects %s', (i) => expect(normalizeDate(i)).toBeNull());
  it('accepts leap day', () => expect(normalizeDate('2024-02-29')).toBe('20240229'));
});

describe('normalizeAmount', () => {
  it.each([['1,234', 1234], ['¥1,234円', 1234], ['１２３４', 1234], ['0', 0]])('%s', (i, o) => expect(normalizeAmount(i as string)).toBe(o));
  it.each(['', '-1', '1.5', 'abc', '99999999999999'])('rejects %s', (i) => expect(normalizeAmount(i)).toBeNull());
});

describe('name', () => {
  it('builds name', () => expect(buildName({ date: '20261015', vendor: '株式会社サンプル', amount: 1234, kind: '請求書', ext: '.pdf' })).toBe('20261015_株式会社サンプル_1234円_請求書.pdf'));
  it('sanitizes forbidden chars and underscore', () => {
    expect(sanitizePart('a/b:c*d?"e<f>g|h\\i')).toBe('abcdefghi');
    expect(sanitizePart('A_B')).toBe('A＿B');
    expect(sanitizePart('  ..x.. ')).toBe('x');
  });
  it('truncates very long names but keeps ext', () => {
    const n = buildName({ date: '20260101', vendor: 'あ'.repeat(500), amount: 1, kind: '', ext: '.pdf' });
    expect(n.endsWith('.pdf')).toBe(true);
    expect(n.length).toBeLessThanOrEqual(124);
  });
  it('getExt', () => {
    expect(getExt('a.PDF')).toBe('.pdf'); expect(getExt('noext')).toBe(''); expect(getExt('.hidden')).toBe(''); expect(getExt('a.b c')).toBe('');
  });
  it('dedupe is case-insensitive', () => expect(dedupe(['a.pdf', 'A.pdf', 'a.pdf', 'b'])).toEqual(['a.pdf', 'A_2.pdf', 'a_3.pdf', 'b']));
});

describe('zip', () => {
  it('crc32 known vector', () => expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926));
  it('produces valid structure', () => {
    const z = createZip([{ name: '日本語.txt', data: new TextEncoder().encode('hello') }, { name: 'b.bin', data: new Uint8Array(0) }]);
    const dv = new DataView(z.buffer);
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    const eocd = z.length - 22;
    expect(dv.getUint32(eocd, true)).toBe(0x06054b50);
    expect(dv.getUint16(eocd + 10, true)).toBe(2);
    const cdOff = dv.getUint32(eocd + 16, true);
    expect(dv.getUint32(cdOff, true)).toBe(0x02014b50);
  });
  it('empty zip ok', () => expect(createZip([]).length).toBe(22));
});

describe('csv', () => {
  it('quotes and guards injection', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('-1+2')).toBe("'-1+2");
    expect(csvCell(-5)).toBe('-5');
  });
  it('roundtrips', () => {
    const rows = [['a', 'b,c'], ['d"e', 'f\ng']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it('has BOM and CRLF', () => expect(toCsv([['a']])).toBe('﻿a\r\n'));
});

describe('guess', () => {
  it('extracts from filename', () => {
    expect(guessFromFilename('請求書_株式会社サンプル_2026-10-15_12,345円.pdf')).toEqual({ date: '20261015', vendor: '株式会社サンプル', amount: '12345' });
  });
  it('handles nothing', () => expect(guessFromFilename('IMG_0001.jpg')).toEqual({ date: '', vendor: '', amount: '' }));
  it('compact date', () => expect(guessFromFilename('20261015_acme.pdf').date).toBe('20261015'));
});

describe('dict', () => {
  const d = { '(株)サンプル': '株式会社サンプル' };
  it('canonicalizes with NFKC/space', () => {
    expect(canonicalVendor(d, '（株）サンプル')).toBe('株式会社サンプル');
    expect(canonicalVendor(d, '別会社')).toBe('別会社');
  });
  it('csv roundtrip & proto safe', () => {
    expect(dictFromCsv(dictToCsv(d))).toEqual(d);
    const x = dictFromCsv('__proto__,evil\na,b');
    expect(Object.keys(x)).toEqual(['a']);
    expect(({} as Record<string, unknown>).evil).toBeUndefined();
  });
});

describe('rows', () => {
  const mk = (id: number, o: Partial<Row>): Row => ({ id, originalName: 'x.pdf', date: '2026-10-15', vendor: 'A', amount: '100', kind: '', ...o });
  it('flags errors and dedupes', () => {
    const r = resolveRows([mk(1, {}), mk(2, {}), mk(3, { date: 'bad', vendor: '' })], {});
    expect(r[0].newName).toBe('20261015_A_100円.pdf');
    expect(r[1].newName).toBe('20261015_A_100円_2.pdf');
    expect(r[2].newName).toBeNull();
    expect(r[2].errors).toHaveLength(2);
  });
  it('ledger sorted, excludes invalid', () => {
    const r = resolveRows([mk(1, { date: '2026-10-20' }), mk(2, { date: '2026-10-01', vendor: 'B,C' }), mk(3, { amount: 'x' })], {});
    const lines = ledgerCsv(r).trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('2026/10/01');
    expect(lines[1]).toContain('"B,C"');
  });
});

describe('regression (Round 2)', () => {
  it('長い取引先名でも日付・金額・種別は切り詰められない', () => {
    const n = buildName({ date: '20260101', vendor: 'あ'.repeat(500), amount: 98765, kind: '請求書', ext: '.pdf' });
    expect(n.startsWith('20260101_')).toBe(true);
    expect(n.endsWith('_98765円_請求書.pdf')).toBe(true);
    expect(n.length).toBeLessThanOrEqual(150);
  });
  it('サロゲートペアを分断しない', () => {
    const n = buildName({ date: '20260101', vendor: '𠮷'.repeat(300), amount: 1, kind: '', ext: '.pdf' });
    expect(n).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });
  it('存在しない和暦年を拒否する', () => {
    expect(normalizeDate('令和0年1月1日')).toBeNull();
    expect(normalizeDate('平成32年1月1日')).toBeNull();
    expect(normalizeDate('昭和65年1月1日')).toBeNull();
    expect(normalizeDate('平成31年4月30日')).toBe('20190430');
  });
});
