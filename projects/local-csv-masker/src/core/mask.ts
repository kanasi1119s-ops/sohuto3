import { findMatches, PII_TYPES, type PiiType } from './detectors';

export type Mode = 'redact' | 'partial' | 'pseudonym';
export type ColumnRule = 'auto' | 'keep' | 'mask' | 'drop';

export interface Options {
  mode: Mode;
  types: PiiType[];
  words: string[];
}

export type Findings = Partial<Record<PiiType, number>>;

const TAGS: Record<PiiType, string> = {
  email: 'EMAIL',
  phone: 'PHONE',
  postal: 'POSTAL',
  mynumber: 'MYNUMBER',
  card: 'CARD',
  ipv4: 'IP',
  custom: 'WORD',
};

export class Masker {
  private seen = new Map<string, string>();
  private counters = new Map<string, number>();
  findings: Findings = {};

  constructor(private opts: Options) {}

  private pseudonym(tag: string, value: string): string {
    const key = `${tag}\u0000${value}`;
    let v = this.seen.get(key);
    if (!v) {
      const n = (this.counters.get(tag) ?? 0) + 1;
      this.counters.set(tag, n);
      v = `${tag}_${String(n).padStart(3, '0')}`;
      this.seen.set(key, v);
    }
    return v;
  }

  private stars(value: string, keepLast: number): string {
    const digits = value.replace(/\D/g, '').length;
    let seen = 0;
    return value.replace(/\d/g, (d) => (++seen > digits - keepLast ? d : '*'));
  }

  private partial(type: PiiType, v: string): string {
    switch (type) {
      case 'email': {
        const at = v.lastIndexOf('@');
        return `${v.slice(0, 1)}***${v.slice(at)}`;
      }
      case 'phone':
      case 'card':
        return this.stars(v, 4);
      case 'mynumber':
        return this.stars(v, 0);
      case 'postal':
        return `${v.slice(0, 3)}-****`;
      case 'ipv4':
        return v.split('.').slice(0, 2).join('.') + '.*.*';
      default:
        return v.slice(0, 1) + '*'.repeat(Math.max(v.length - 1, 1));
    }
  }

  private replacement(type: PiiType, value: string): string {
    if (this.opts.mode === 'redact') return `[${TAGS[type]}]`;
    if (this.opts.mode === 'pseudonym') return this.pseudonym(TAGS[type], value);
    return this.partial(type, value);
  }

  maskText(text: string): string {
    const matches = findMatches(text, this.opts.types, this.opts.words);
    if (!matches.length) return text;
    let out = '';
    let pos = 0;
    for (const m of matches) {
      out += text.slice(pos, m.start) + this.replacement(m.type, m.value);
      this.findings[m.type] = (this.findings[m.type] ?? 0) + 1;
      pos = m.end;
    }
    return out + text.slice(pos);
  }

  /** 列全体をマスクする（列ルール mask） */
  maskWhole(colName: string, value: string): string {
    if (value === '') return value;
    this.findings.custom = (this.findings.custom ?? 0) + 1;
    if (this.opts.mode === 'redact') return '[MASKED]';
    if (this.opts.mode === 'pseudonym') return this.pseudonym(colName.toUpperCase() || 'COL', value);
    return value.slice(0, 1) + '*'.repeat(Math.max(value.length - 1, 1));
  }
}

export interface TableResult {
  rows: string[][];
  findings: Findings;
}

export function maskTable(
  rows: string[][],
  opts: Options,
  hasHeader: boolean,
  columnRules: Record<number, ColumnRule> = {},
): TableResult {
  const masker = new Masker(opts);
  const header = hasHeader ? (rows[0] ?? []) : [];
  const out: string[][] = [];
  rows.forEach((row, r) => {
    const isHeader = hasHeader && r === 0;
    const next: string[] = [];
    row.forEach((cell, c) => {
      const rule = columnRules[c] ?? 'auto';
      if (rule === 'drop') return;
      if (isHeader || rule === 'keep') next.push(cell);
      else if (rule === 'mask') next.push(masker.maskWhole(header[c] ?? `COL${c + 1}`, cell));
      else next.push(masker.maskText(cell));
    });
    out.push(next);
  });
  return { rows: out, findings: masker.findings };
}

export function maskPlainText(text: string, opts: Options): { text: string; findings: Findings } {
  const masker = new Masker(opts);
  return { text: masker.maskText(text), findings: masker.findings };
}

// ---- 設定プロファイル（JSON 入出力） ----
export interface Profile {
  version: 1;
  mode: Mode;
  types: PiiType[];
  words: string[];
  hasHeader: boolean;
  columnRules: Record<string, ColumnRule>; // 列名 → ルール
}

export const DEFAULT_PROFILE: Profile = {
  version: 1,
  mode: 'redact',
  types: PII_TYPES.filter((t) => t !== 'ipv4'),
  words: [],
  hasHeader: true,
  columnRules: {},
};

export function parseProfile(json: string): Profile {
  const o: unknown = JSON.parse(json);
  if (typeof o !== 'object' || o === null) throw new Error('設定ファイルの形式が不正です');
  const p = o as Record<string, unknown>;
  if (p.version !== 1) throw new Error('未対応の設定バージョンです');
  const modes: Mode[] = ['redact', 'partial', 'pseudonym'];
  const rules: ColumnRule[] = ['auto', 'keep', 'mask', 'drop'];
  if (!modes.includes(p.mode as Mode)) throw new Error('mode が不正です');
  if (!Array.isArray(p.types) || !p.types.every((t) => PII_TYPES.includes(t as PiiType)))
    throw new Error('types が不正です');
  if (!Array.isArray(p.words) || !p.words.every((w) => typeof w === 'string'))
    throw new Error('words が不正です');
  const cr: Record<string, ColumnRule> = {};
  if (typeof p.columnRules === 'object' && p.columnRules !== null) {
    for (const [k, v] of Object.entries(p.columnRules)) {
      if (!rules.includes(v as ColumnRule)) throw new Error('columnRules が不正です');
      cr[k] = v as ColumnRule;
    }
  }
  return {
    version: 1,
    mode: p.mode as Mode,
    types: p.types as PiiType[],
    words: p.words as string[],
    hasHeader: p.hasHeader !== false,
    columnRules: cr,
  };
}
