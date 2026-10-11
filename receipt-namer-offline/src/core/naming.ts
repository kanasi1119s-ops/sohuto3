import { DOC_TYPES, type DocType, type RecordMeta } from './types';

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;
export const MAX_VENDOR_LEN = 40;

/** 全角数字・カンマ・円記号を除去して整数に。不正なら null。 */
export function parseAmount(raw: string): number | null {
  const s = raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，¥￥円\s]/g, '');
  if (!/^\d{1,12}$/.test(s)) return null;
  return Number(s);
}

export function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidRegNo(s: string): boolean {
  return s === '' || /^T\d{13}$/.test(s);
}

export function sanitizeVendor(raw: string): string {
  let v = raw.normalize('NFKC').replace(FORBIDDEN, '').replace(/\s+/g, '_');
  v = v.replace(/^[._]+|[._]+$/g, '');
  v = Array.from(v).slice(0, MAX_VENDOR_LEN).join('');
  if (WINDOWS_RESERVED.test(v)) v = `_${v}`;
  return v;
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  if (i <= 0 || i === name.length - 1) return '';
  const ext = name.slice(i).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

export function validate(m: RecordMeta): string[] {
  const errs: string[] = [];
  if (!isValidDate(m.date)) errs.push('取引日が不正です');
  if (sanitizeVendor(m.vendor) === '') errs.push('取引先を入力してください');
  if (parseAmount(m.amount) === null) errs.push('金額は整数で入力してください');
  if (!(DOC_TYPES as readonly string[]).includes(m.type)) errs.push('書類種別が不正です');
  if (!isValidRegNo(m.regNo)) errs.push('登録番号は T+13桁の数字です');
  return errs;
}

/** 電帳法の検索要件(日付・金額・取引先)をファイル名で満たす: YYYYMMDD_取引先_金額_種別.ext */
export function baseName(m: RecordMeta): string {
  const amount = parseAmount(m.amount) ?? 0;
  return `${m.date.replace(/-/g, '')}_${sanitizeVendor(m.vendor)}_${amount}_${m.type}`;
}

/** 全レコードの最終ファイル名を返す(重複は _2, _3...)。不正なレコードは null。 */
export function assignFileNames(records: RecordMeta[]): (string | null)[] {
  const used = new Set<string>();
  return records.map((m) => {
    if (validate(m).length > 0) return null;
    const ext = extensionOf(m.originalName);
    const base = baseName(m);
    let name = base + ext;
    let n = 2;
    while (used.has(name.toLowerCase())) name = `${base}_${n++}${ext}`;
    used.add(name.toLowerCase());
    return name;
  });
}

export type { DocType };
