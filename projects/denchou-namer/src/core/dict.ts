import { parseCsv, toCsv } from './csv';

/** 取引先の表記ゆれ辞書。キー(別名)→正規名。照合は NFKC + 小文字化 + 空白除去。 */
export type Dict = Record<string, string>;

const key = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');

export function canonicalVendor(dict: Dict, vendor: string): string {
  const k = key(vendor);
  for (const [alias, name] of Object.entries(dict)) if (key(alias) === k) return name;
  return vendor;
}

export function dictToCsv(dict: Dict): string {
  return toCsv([['別名', '正規の取引先名'], ...Object.entries(dict)]);
}

export function dictFromCsv(text: string): Dict {
  const out: Dict = {};
  const rows = parseCsv(text);
  for (const [i, r] of rows.entries()) {
    if (i === 0 && r[0] === '別名') continue;
    const [a, b] = [r[0]?.trim(), r[1]?.trim()];
    if (a && b && a !== '__proto__' && b !== '__proto__') out[a] = b;
  }
  return out;
}
