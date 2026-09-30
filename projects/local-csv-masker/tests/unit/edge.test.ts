import { describe, expect, it } from 'vitest';
import { findMatches, PII_TYPES } from '../../src/core/detectors';
import { maskPlainText, maskTable, type Options } from '../../src/core/mask';
import { parseCsv, stringifyCsv } from '../../src/core/csv';

const opts = (mode: Options['mode']): Options => ({ mode, types: PII_TYPES, words: [] });

describe('Round2 regressions', () => {
  it('detects full-width digits/hyphens/@ (common in Japanese data)', () => {
    expect(findMatches('０９０－１２３４－５６７８', PII_TYPES).map((m) => m.type)).toEqual(['phone']);
    expect(findMatches('ｔａｒｏ＠ｅｘａｍｐｌｅ．ｃｏｍ', PII_TYPES).map((m) => m.type)).toEqual(['email']);
    expect(maskPlainText('〒１００−０００１', opts('redact')).text).toBe('〒[POSTAL]');
  });
  it('partial mode masks full-width digits too', () => {
    expect(maskPlainText('０９０－１２３４－５６７８', opts('partial')).text).toBe('***-****-5678');
  });
  it('email pseudonym is case-insensitive', () => {
    expect(maskPlainText('A@x.com a@X.com', opts('pseudonym')).text).toBe('EMAIL_001 EMAIL_001');
  });
  it('handles large input quickly (100k rows)', () => {
    const rows = Array.from({ length: 100_000 }, (_, i) => [`n${i}`, `u${i}@example.com`, '03-1234-5678']);
    const csv = stringifyCsv(rows);
    const t = Date.now();
    const out = maskTable(parseCsv(csv), opts('redact'), false);
    expect(out.rows.length).toBe(100_000);
    expect(Date.now() - t).toBeLessThan(10_000);
  });
  it('pathological long digit/space strings do not hang', () => {
    const t = Date.now();
    findMatches('1 '.repeat(50_000), PII_TYPES);
    findMatches('0-'.repeat(50_000), PII_TYPES);
    expect(Date.now() - t).toBeLessThan(5_000);
  });
  it('unterminated quote does not lose data', () => {
    expect(parseCsv('a,"b\nc')).toEqual([['a', 'b\nc']]);
  });
});
