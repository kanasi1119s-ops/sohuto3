import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, Masker, maskPlainText, maskTable, parseProfile, type Options } from '../../src/core/mask';
import { PII_TYPES } from '../../src/core/detectors';

const opts = (mode: Options['mode']): Options => ({ mode, types: PII_TYPES, words: [] });

describe('mask modes', () => {
  const src = 'mail taro@example.com tel 03-1234-5678 zip 100-0001';
  it('redact', () => {
    expect(maskPlainText(src, opts('redact')).text).toBe('mail [EMAIL] tel [PHONE] zip [POSTAL]');
  });
  it('partial', () => {
    expect(maskPlainText(src, opts('partial')).text).toBe('mail t***@example.com tel **-****-5678 zip 100-****');
  });
  it('pseudonym is consistent for same value', () => {
    const m = new Masker(opts('pseudonym'));
    expect(m.maskText('a@x.com b@x.com a@x.com')).toBe('EMAIL_001 EMAIL_002 EMAIL_001');
  });
  it('counts findings', () => {
    expect(maskPlainText(src, opts('redact')).findings).toEqual({ email: 1, phone: 1, postal: 1 });
  });
});

describe('maskTable', () => {
  const rows = [['name', 'mail', 'memo'], ['山田', 'a@x.com', 'tel 090-1111-2222'], ['佐藤', '', 'なし']];
  it('auto / mask / drop / keep rules, header untouched', () => {
    const r = maskTable(rows, opts('redact'), true, { 0: 'mask', 1: 'keep', 2: 'auto' });
    expect(r.rows).toEqual([['name', 'mail', 'memo'], ['[MASKED]', 'a@x.com', 'tel [PHONE]'], ['[MASKED]', '', 'なし']]);
    const d = maskTable(rows, opts('redact'), true, { 0: 'drop' });
    expect(d.rows[0]).toEqual(['mail', 'memo']);
  });
  it('column pseudonym uses header name', () => {
    const r = maskTable(rows, opts('pseudonym'), true, { 0: 'mask' });
    expect(r.rows[1]?.[0]).toBe('NAME_001');
  });
  it('handles empty table and ragged rows', () => {
    expect(maskTable([], opts('redact'), true).rows).toEqual([]);
    expect(maskTable([['a'], ['x', 'b@x.com']], opts('redact'), false).rows[1]).toEqual(['x', '[EMAIL]']);
  });
});

describe('profile', () => {
  it('round-trips', () => {
    expect(parseProfile(JSON.stringify(DEFAULT_PROFILE))).toEqual(DEFAULT_PROFILE);
  });
  it('rejects bad input', () => {
    expect(() => parseProfile('null')).toThrow();
    expect(() => parseProfile('{"version":2}')).toThrow();
    expect(() => parseProfile('{"version":1,"mode":"x","types":[],"words":[]}')).toThrow();
    expect(() => parseProfile('not json')).toThrow();
  });
});
