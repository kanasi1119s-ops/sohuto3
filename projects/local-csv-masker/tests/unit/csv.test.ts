import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv, stringifyCsv } from '../../src/core/csv';

describe('csv', () => {
  it('parses quotes, escaped quotes and embedded newlines', () => {
    const rows = parseCsv('a,b\r\n"x,1","he said ""hi""\nthere"\r\n');
    expect(rows).toEqual([['a', 'b'], ['x,1', 'he said "hi"\nthere']]);
  });
  it('handles BOM, no trailing newline and empty input', () => {
    expect(parseCsv('\uFEFFa,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('')).toEqual([]);
  });
  it('keeps empty fields', () => {
    expect(parseCsv('a,,c\n,,\n')).toEqual([['a', '', 'c'], ['', '', '']]);
  });
  it('round-trips', () => {
    const rows = [['a', 'b,c'], ['"q"', 'l1\nl2']];
    expect(parseCsv(stringifyCsv(rows))).toEqual(rows);
  });
  it('detects delimiter', () => {
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
    expect(detectDelimiter('a;b;c')).toBe(';');
    expect(detectDelimiter('abc')).toBe(',');
  });
});
