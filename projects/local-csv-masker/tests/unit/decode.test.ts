import { describe, expect, it } from 'vitest';
import { decodeBytes, encodeUtf8 } from '../../src/core/decode';

describe('decode', () => {
  it('reads utf-8', () => {
    const b = new TextEncoder().encode('山田');
    expect(decodeBytes(b.buffer as ArrayBuffer)).toEqual({ text: '山田', encoding: 'utf-8' });
  });
  it('falls back to shift_jis', () => {
    const sjis = new Uint8Array([0x8e, 0x52, 0x93, 0x63]); // 山田
    expect(decodeBytes(sjis.buffer)).toEqual({ text: '山田', encoding: 'shift_jis' });
  });
  it('adds BOM', () => {
    expect(Array.from(encodeUtf8('a', true).slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(encodeUtf8('a', false).length).toBe(1);
  });
});
