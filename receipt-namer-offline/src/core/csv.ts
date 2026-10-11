import { parseAmount } from './naming';
import type { RecordMeta } from './types';

/** CSV/数式インジェクション対策: 先頭が = + - @ タブ CR の文字列セルにはアポストロフィを付与 */
export function csvCell(v: string): string {
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = ['取引日', '取引先', '金額', '書類種別', '登録番号', '元ファイル名', '保存ファイル名'];

/** Excel で開けるよう UTF-8 BOM + CRLF */
export function buildIndexCsv(records: RecordMeta[], fileNames: (string | null)[]): string {
  const rows = [CSV_HEADER.map(csvCell).join(',')];
  records.forEach((m, i) => {
    const name = fileNames[i];
    if (!name) return;
    rows.push(
      [m.date, m.vendor, String(parseAmount(m.amount) ?? ''), m.type, m.regNo, m.originalName, name]
        .map(csvCell)
        .join(','),
    );
  });
  return '﻿' + rows.join('\r\n') + '\r\n';
}
