export interface Entry {
  date: string; // YYYYMMDD
  vendor: string;
  amount: number;
  kind: string; // 書類種別(任意)
  ext: string; // ".pdf" 形式(空可)
}

// Windows/macOS/Linux いずれでも使えない・紛らわしい文字と制御文字
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

export function sanitizePart(s: string): string {
  return s
    .normalize('NFC')
    .replace(FORBIDDEN, '')
    .replace(/_/g, '＿') // 区切り文字との衝突回避
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();
}

export function getExt(filename: string): string {
  const i = filename.lastIndexOf('.');
  if (i <= 0 || i === filename.length - 1) return '';
  const e = filename.slice(i).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(e) ? e : '';
}

/** 取引先名の最大コードポイント数。日付・金額・種別は検索要件のため切り詰めない。 */
const MAX_VENDOR = 60;
const MAX_KIND = 20;

const clip = (s: string, n: number) => Array.from(s).slice(0, n).join('');

/** 命名規則: 取引年月日_取引先_金額[_種別].ext */
export function buildName(e: Entry): string {
  const parts = [e.date, clip(sanitizePart(e.vendor), MAX_VENDOR), `${e.amount}円`];
  const kind = clip(sanitizePart(e.kind), MAX_KIND);
  if (kind) parts.push(kind);
  return parts.join('_') + e.ext;
}

/** 同名が出たら _2, _3 ... を拡張子の前に付けて一意化する。大文字小文字は区別しない。 */
export function dedupe(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((n) => {
    const ext = getExt(n);
    const base = ext ? n.slice(0, -ext.length) : n;
    let cand = n;
    let i = 2;
    while (used.has(cand.toLowerCase())) cand = `${base}_${i++}${ext}`;
    used.add(cand.toLowerCase());
    return cand;
  });
}
