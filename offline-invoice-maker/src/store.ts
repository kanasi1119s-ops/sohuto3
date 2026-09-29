import { isValidRegistrationNumber, validateLine, type Line, type Rounding } from './calc';

export interface Settings {
  issuerName: string;
  issuerAddress: string;
  registrationNumber: string; // 空 or T+13桁
  bankInfo: string;
  rounding: Rounding;
  withholding: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  clientName: string;
  note: string;
  lines: Line[];
  updatedAt: string;
}

export interface AppData {
  version: 1;
  settings: Settings;
  invoices: Invoice[];
}

export const KEY = 'offline-invoice-maker:v1';

export const defaultSettings = (): Settings => ({
  issuerName: '',
  issuerAddress: '',
  registrationNumber: '',
  bankInfo: '',
  rounding: 'floor',
  withholding: false,
});

export const emptyData = (): AppData => ({ version: 1, settings: defaultSettings(), invoices: [] });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '');

/** 不正な形式は例外を投げる。インポート・復元の双方で使用。 */
export function parseData(raw: unknown): AppData {
  if (!isObj(raw) || raw.version !== 1) throw new Error('対応していないファイル形式です');
  const s = isObj(raw.settings) ? raw.settings : {};
  const rounding: Rounding = s.rounding === 'round' || s.rounding === 'ceil' ? s.rounding : 'floor';
  const reg = str(s.registrationNumber, 20);
  const settings: Settings = {
    issuerName: str(s.issuerName, 200),
    issuerAddress: str(s.issuerAddress, 500),
    registrationNumber: reg === '' || isValidRegistrationNumber(reg) ? reg : '',
    bankInfo: str(s.bankInfo, 500),
    rounding,
    withholding: s.withholding === true,
  };
  if (!Array.isArray(raw.invoices)) throw new Error('請求書データがありません');
  const invoices: Invoice[] = raw.invoices.map((iv, idx) => {
    if (!isObj(iv) || !Array.isArray(iv.lines)) throw new Error(`請求書 ${idx + 1} の形式が不正です`);
    const lines: Line[] = iv.lines.map((l, j) => {
      if (!isObj(l)) throw new Error(`請求書 ${idx + 1} の明細 ${j + 1} が不正です`);
      const line: Line = {
        name: str(l.name, 200),
        qty: Number(l.qty),
        unitPrice: Number(l.unitPrice),
        taxRate: l.taxRate === 8 ? 8 : 10,
      };
      const err = validateLine(line);
      if (err) throw new Error(`請求書 ${idx + 1} の明細 ${j + 1}: ${err}`);
      return line;
    });
    return {
      id: str(iv.id, 64) || crypto.randomUUID(),
      number: str(iv.number, 64),
      issueDate: str(iv.issueDate, 10),
      dueDate: str(iv.dueDate, 10),
      clientName: str(iv.clientName, 200),
      note: str(iv.note, 1000),
      lines,
      updatedAt: str(iv.updatedAt, 40),
    };
  });
  return { version: 1, settings, invoices };
}

export function load(storage: Storage = localStorage): AppData {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return emptyData();
    return parseData(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

export function save(data: AppData, storage: Storage = localStorage): void {
  storage.setItem(KEY, JSON.stringify(data));
}

export const exportJson = (data: AppData): string => JSON.stringify(data, null, 2);
export const importJson = (text: string): AppData => parseData(JSON.parse(text));

const csvCell = (v: string | number): string => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // CSV/数式インジェクション対策
  return `"${s.replace(/"/g, '""')}"`;
};

export function exportCsv(data: AppData, calc: (i: Invoice) => number): string {
  const head = ['請求書番号', '発行日', '支払期限', '請求先', '請求額(税込)'];
  const rows = data.invoices.map((i) => [i.number, i.issueDate, i.dueDate, i.clientName, calc(i)].map(csvCell).join(','));
  return '﻿' + [head.map(csvCell).join(','), ...rows].join('\r\n');
}
