import { describe, expect, it } from 'vitest';
import { assignFileNames, extensionOf, isValidDate, parseAmount, sanitizeVendor, validate } from '../src/core/naming';
import { buildIndexCsv, csvCell } from '../src/core/csv';
import { createZip, crc32, readZip } from '../src/core/zip';
import type { RecordMeta } from '../src/core/types';

const rec = (o: Partial<RecordMeta> = {}): RecordMeta => ({ id: '1', originalName: 'scan.pdf', date: '2026-10-11', vendor: '株式会社テスト', amount: '11,000', type: '領収書', regNo: '', ...o });

describe('naming', () => {
  it('parses amounts incl. full-width and symbols', () => {
    expect(parseAmount('１１，０００円')).toBe(11000);
    expect(parseAmount('¥ 5 000')).toBe(5000);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-1')).toBeNull();
    expect(parseAmount('1.5')).toBeNull();
    expect(parseAmount('9'.repeat(13))).toBeNull();
  });
  it('validates dates', () => {
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
  it('sanitizes vendor (path traversal, reserved, length)', () => {
    expect(sanitizeVendor('../../etc/passwd')).toBe('etcpasswd');
    expect(sanitizeVendor('a/b\\c:d*e?')).toBe('abcde');
    expect(sanitizeVendor('CON')).toBe('_CON');
    expect(sanitizeVendor('  A  B ')).toBe('A_B');
    expect(Array.from(sanitizeVendor('あ'.repeat(100))).length).toBe(40);
    expect(sanitizeVendor('...')).toBe('');
  });
  it('extension handling', () => {
    expect(extensionOf('A.PDF')).toBe('.pdf');
    expect(extensionOf('noext')).toBe('');
    expect(extensionOf('.hidden')).toBe('');
    expect(extensionOf('x.<script>')).toBe('');
  });
  it('validate reports errors', () => {
    expect(validate(rec())).toEqual([]);
    expect(validate(rec({ vendor: '' })).length).toBe(1);
    expect(validate(rec({ regNo: 'T123' })).length).toBe(1);
    expect(validate(rec({ regNo: 'T1234567890123' }))).toEqual([]);
  });
  it('builds names and de-duplicates case-insensitively', () => {
    const names = assignFileNames([rec(), rec({ id: '2' }), rec({ id: '3', originalName: 'x.PNG' }), rec({ id: '4', vendor: '' })]);
    expect(names[0]).toBe('20261011_株式会社テスト_11000_領収書.pdf');
    expect(names[1]).toBe('20261011_株式会社テスト_11000_領収書_2.pdf');
    expect(names[2]).toBe('20261011_株式会社テスト_11000_領収書.png');
    expect(names[3]).toBeNull();
  });
});

describe('csv', () => {
  it('escapes and neutralizes formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe("'+1");
  });
  it('builds BOM + CRLF csv, skipping invalid rows', () => {
    const rs = [rec(), rec({ id: '2', vendor: '' })];
    const csv = buildIndexCsv(rs, assignFileNames(rs));
    expect(csv.startsWith('﻿取引日,')).toBe(true);
    expect(csv.split('\r\n').filter(Boolean).length).toBe(2);
    expect(csv).toContain('2026-10-11,株式会社テスト,11000,領収書');
  });
});

describe('zip', () => {
  it('crc32 known value', () => { expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926); });
  it('roundtrips including unicode names and empty/binary data', () => {
    const bin = new Uint8Array(70000).map((_, i) => i % 251);
    const z = createZip([{ name: 'files/日本語.pdf', data: bin }, { name: 'e.txt', data: new Uint8Array(0) }]);
    const out = readZip(z);
    expect(out.map((e) => e.name)).toEqual(['files/日本語.pdf', 'e.txt']);
    expect(out[0].data).toEqual(bin);
    expect(out[1].data.length).toBe(0);
  });
  it('rejects garbage and corrupted data', () => {
    expect(() => readZip(new Uint8Array(10))).toThrow();
    const z = createZip([{ name: 'a', data: new TextEncoder().encode('hello') }]);
    z[30 + 1] ^= 0xff; // corrupt payload
    expect(() => readZip(z)).toThrow();
  });
});
