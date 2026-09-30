import { describe, expect, it } from 'vitest';
import { findMatches, luhn, PII_TYPES, validMyNumber } from '../../src/core/detectors';

const all = PII_TYPES;

describe('validators', () => {
  it('luhn', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true);
    expect(luhn('4111 1111 1111 1112')).toBe(false);
  });
  it('mynumber check digit', () => {
    expect(validMyNumber('123456789018')).toBe(true);
    expect(validMyNumber('123456789012')).toBe(false);
    expect(validMyNumber('12345')).toBe(false);
  });
});

describe('findMatches', () => {
  const types = (s: string) => findMatches(s, all).map((m) => m.type);
  it('detects each type', () => {
    expect(types('taro@example.co.jp')).toEqual(['email']);
    expect(types('03-1234-5678')).toEqual(['phone']);
    expect(types('090-1234-5678')).toEqual(['phone']);
    expect(types('+81 90-1234-5678')).toEqual(['phone']);
    expect(types('〒100-0001')).toEqual(['postal']);
    expect(types('4111-1111-1111-1111')).toEqual(['card']);
    expect(types('1234 5678 9018')).toEqual(['mynumber']);
    expect(types('192.168.0.1')).toEqual(['ipv4']);
  });
  it('does not flag invalid numbers or plain numbers', () => {
    expect(types('注文番号 12345678')).toEqual([]);
    expect(types('1234 5678 9012')).toEqual([]);
    expect(types('999.999.1.1')).toEqual([]);
    expect(types('2026-09-30')).toEqual([]);
  });
  it('no overlapping matches; email wins over others', () => {
    const m = findMatches('090-1234-5678 a.090@example.com', all);
    expect(m.map((x) => x.type)).toEqual(['phone', 'email']);
  });
  it('custom words are escaped and case-insensitive', () => {
    const m = findMatches('Acme (株) と ACME', ['email'], ['acme', '(株)']).length;
    expect(m).toBe(0); // custom 未有効なら検出しない
    const r = findMatches('Acme (株) と ACME', ['custom'], ['acme', '(株)']);
    expect(r.map((x) => x.value)).toEqual(['Acme', '(株)', 'ACME']);
  });
});
