/** UTF-8 として不正なら Shift_JIS(CP932) として読み直す。 */
export function decodeBytes(buf: ArrayBuffer): { text: string; encoding: 'utf-8' | 'shift_jis' } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buf), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('shift_jis').decode(buf), encoding: 'shift_jis' };
  }
}

export function encodeUtf8(text: string, withBom: boolean): Uint8Array<ArrayBuffer> {
  const body = new TextEncoder().encode(text);
  const offset = withBom ? 3 : 0;
  const out = new Uint8Array(body.length + offset);
  if (withBom) out.set([0xef, 0xbb, 0xbf]);
  out.set(body, offset);
  return out;
}
