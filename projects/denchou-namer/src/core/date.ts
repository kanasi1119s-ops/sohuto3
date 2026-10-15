/** 日付文字列を YYYYMMDD に正規化する。解釈できない・実在しない日付は null。 */
const ERAS: Record<string, number> = { R: 2018, 令和: 2018, H: 1988, 平成: 1988, S: 1925, 昭和: 1925 };

function valid(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
}

export function toHalfWidth(s: string): string {
  return s
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[－ー―‐]/g, '-')
    .replace(/，/g, ',');
}

export function normalizeDate(input: string): string | null {
  const s = toHalfWidth(input.trim());
  if (!s) return null;
  let m = s.match(/^(令和|平成|昭和|[RHS])\s*(\d{1,2}|元)\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*日?$/);
  if (m) {
    const n = m[2] === '元' ? 1 : Number(m[2]);
    const max = { R: 99, 令和: 99, H: 31, 平成: 31, S: 64, 昭和: 64 }[m[1]] ?? 0;
    if (n < 1 || n > max) return null;
    return valid(ERAS[m[1]] + n, Number(m[3]), Number(m[4]));
  }
  m = s.match(/^(\d{4})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*日?$/);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}
