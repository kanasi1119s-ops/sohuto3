import { normalizeDate } from './date';
import { normalizeAmount } from './amount';
import { buildName, dedupe, getExt, sanitizePart } from './name';
import { canonicalVendor, type Dict } from './dict';
import { toCsv } from './csv';

export interface Row {
  id: number;
  originalName: string;
  date: string; // ユーザー入力(未正規化)
  vendor: string;
  amount: string;
  kind: string;
}

export interface Resolved {
  row: Row;
  newName: string | null;
  errors: string[];
  date?: string;
  vendor?: string;
  amount?: number;
}

export function resolveRows(rows: Row[], dict: Dict): Resolved[] {
  const partial = rows.map((row) => {
    const errors: string[] = [];
    const date = normalizeDate(row.date);
    if (!date) errors.push('取引年月日が不正です');
    const vendor = sanitizePart(canonicalVendor(dict, row.vendor.trim()));
    if (!vendor) errors.push('取引先が未入力です');
    const amount = normalizeAmount(row.amount);
    if (amount === null) errors.push('取引金額が不正です(0以上の整数)');
    const ok = errors.length === 0;
    const name = ok
      ? buildName({ date: date!, vendor, amount: amount!, kind: row.kind, ext: getExt(row.originalName) })
      : null;
    return { row, errors, date: date ?? undefined, vendor, amount: amount ?? undefined, name };
  });
  const okIdx = partial.map((p, i) => (p.name ? i : -1)).filter((i) => i >= 0);
  const unique = dedupe(okIdx.map((i) => partial[i].name!));
  const byIdx = new Map(okIdx.map((i, k) => [i, unique[k]]));
  return partial.map((p, i) => ({
    row: p.row, errors: p.errors, date: p.date, vendor: p.vendor, amount: p.amount,
    newName: byIdx.get(i) ?? null,
  }));
}

export function ledgerCsv(resolved: Resolved[]): string {
  const head = ['取引年月日', '取引先', '取引金額', '書類種別', '保存ファイル名', '元ファイル名'];
  const body = resolved
    .filter((r) => r.newName)
    .sort((a, b) => a.date!.localeCompare(b.date!) || a.newName!.localeCompare(b.newName!))
    .map((r) => [
      `${r.date!.slice(0, 4)}/${r.date!.slice(4, 6)}/${r.date!.slice(6)}`,
      r.vendor!, r.amount!, sanitizePart(r.row.kind), r.newName!, r.row.originalName,
    ]);
  return toCsv([head, ...body]);
}
