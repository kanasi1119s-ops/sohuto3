export type PiiType = 'email' | 'phone' | 'postal' | 'mynumber' | 'card' | 'ipv4' | 'custom';

export const PII_TYPES: PiiType[] = ['email', 'phone', 'postal', 'mynumber', 'card', 'ipv4', 'custom'];

export const PII_LABELS: Record<PiiType, string> = {
  email: 'メールアドレス',
  phone: '電話番号',
  postal: '郵便番号',
  mynumber: 'マイナンバー',
  card: 'クレジットカード番号',
  ipv4: 'IPv4アドレス',
  custom: 'ユーザー指定語',
};

export interface Match {
  type: PiiType;
  start: number;
  end: number;
  value: string;
}

const digitsOf = (s: string) => s.replace(/\D/g, '');

export function luhn(num: string): boolean {
  const d = digitsOf(num);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** 個人番号(12桁)のチェックデジット検証 */
export function validMyNumber(num: string): boolean {
  const d = digitsOf(num);
  if (d.length !== 12) return false;
  let sum = 0;
  for (let n = 1; n <= 11; n++) {
    const p = Number(d[11 - n]);
    const q = n <= 6 ? n + 1 : n - 5;
    sum += p * q;
  }
  const r = sum % 11;
  const check = r <= 1 ? 0 : 11 - r;
  return check === Number(d[11]);
}

function validPhone(v: string): boolean {
  let d = digitsOf(v);
  if (v.startsWith('+81')) d = '0' + d.slice(2);
  return d.length >= 10 && d.length <= 11 && d.startsWith('0');
}

interface Rule {
  type: PiiType;
  re: RegExp;
  validate?: (v: string) => boolean;
}

// 優先度順（重複範囲は先に定義されたものを採用）
const RULES: Rule[] = [
  { type: 'email', re: /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g },
  { type: 'card', re: /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g, validate: luhn },
  { type: 'mynumber', re: /(?<!\d)\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d)/g, validate: validMyNumber },
  { type: 'phone', re: /(?<![\d+])(?:\+81[- ]?|0)\d{1,4}[- ]?\d{1,4}[- ]?\d{3,4}(?!\d)/g, validate: validPhone },
  { type: 'postal', re: /(?<!\d)\d{3}-\d{4}(?!\d)/g },
  {
    type: 'ipv4',
    re: /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d.])/g,
  },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 全角英数記号・各種ハイフンを半角に寄せる（文字数は変えない＝位置が元文字列と一致する） */
export function foldWidth(text: string): string {
  return text.replace(/[\uFF01-\uFF5E\u2010-\u2015\u2212\u30FC\u3000]/g, (c) => {
    const code = c.charCodeAt(0);
    if (code >= 0xff01 && code <= 0xff5e) return String.fromCharCode(code - 0xfee0);
    if (code === 0x3000) return ' ';
    return '-';
  });
}

export function findMatches(text: string, enabled: PiiType[], words: string[] = []): Match[] {
  const folded = foldWidth(text);
  const all: Match[] = [];
  for (const rule of RULES) {
    if (!enabled.includes(rule.type)) continue;
    for (const m of folded.matchAll(rule.re)) {
      if (rule.validate && !rule.validate(m[0])) continue;
      all.push({ type: rule.type, start: m.index, end: m.index + m[0].length, value: m[0] });
    }
  }
  const ws = words.map((w) => w.trim()).filter(Boolean);
  if (enabled.includes('custom') && ws.length) {
    const re = new RegExp(ws.sort((a, b) => b.length - a.length).map(escapeRe).join('|'), 'giu');
    for (const m of text.matchAll(re)) {
      all.push({ type: 'custom', start: m.index, end: m.index + m[0].length, value: m[0] });
    }
  }
  // 先勝ち（RULES順→位置順）で重複を除去。占有マップで O(n)。
  const taken = new Uint8Array(text.length);
  const accepted: Match[] = [];
  for (const m of all) {
    let free = true;
    for (let i = m.start; i < m.end; i++) {
      if (taken[i]) {
        free = false;
        break;
      }
    }
    if (!free) continue;
    taken.fill(1, m.start, m.end);
    accepted.push(m);
  }
  return accepted.sort((a, b) => a.start - b.start);
}
