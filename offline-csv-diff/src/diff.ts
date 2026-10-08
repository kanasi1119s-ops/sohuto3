import type { Row } from "./csv";

export interface CellChange { column: string; before: string; after: string }
export interface DiffResult {
  columnsAdded: string[];
  columnsRemoved: string[];
  added: Record<string, string>[];
  removed: Record<string, string>[];
  changed: { key: string; changes: CellChange[] }[];
  unchanged: number;
  warnings: string[];
}

function toRecords(rows: Row[], label: string, warnings: string[]) {
  const [header = [], ...body] = rows;
  const recs = body
    .filter((r) => r.some((c) => c !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
  if (new Set(header).size !== header.length) warnings.push(`${label}: 見出しに重複があります`);
  return { header, recs };
}

/** keyColumns の組で行を突き合わせて差分を取る。行順や列順の違いは差分にしない。 */
export function diffCsv(a: Row[], b: Row[], keyColumns: string[]): DiffResult {
  const warnings: string[] = [];
  if (keyColumns.length === 0) throw new Error("キー列を1つ以上指定してください");
  const A = toRecords(a, "旧", warnings);
  const B = toRecords(b, "新", warnings);
  for (const k of keyColumns) {
    if (!A.header.includes(k) || !B.header.includes(k)) throw new Error(`キー列「${k}」が両方のファイルにありません`);
  }
  const keyOf = (r: Record<string, string>) => keyColumns.map((k) => r[k]).join("\u0001");
  const index = (recs: Record<string, string>[], label: string) => {
    const m = new Map<string, Record<string, string>>();
    for (const r of recs) {
      const k = keyOf(r);
      if (m.has(k)) warnings.push(`${label}: キー「${k.replace(/\u0001/g, " / ")}」が重複(後の行を採用)`);
      m.set(k, r);
    }
    return m;
  };
  const ma = index(A.recs, "旧");
  const mb = index(B.recs, "新");
  const common = A.header.filter((h) => B.header.includes(h));
  const result: DiffResult = {
    columnsAdded: B.header.filter((h) => !A.header.includes(h)),
    columnsRemoved: A.header.filter((h) => !B.header.includes(h)),
    added: [], removed: [], changed: [], unchanged: 0, warnings,
  };
  for (const [k, ra] of ma) {
    const rb = mb.get(k);
    if (!rb) { result.removed.push(ra); continue; }
    const changes = common.filter((c) => ra[c] !== rb[c]).map((c) => ({ column: c, before: ra[c], after: rb[c] }));
    if (changes.length) result.changed.push({ key: k.replace(/\u0001/g, " / "), changes });
    else result.unchanged++;
  }
  for (const [k, rb] of mb) if (!ma.has(k)) result.added.push(rb);
  return result;
}

export function diffToRows(d: DiffResult, keyColumns: string[]): Row[] {
  const out: Row[] = [["種別", "キー", "列", "旧", "新"]];
  const key = (r: Record<string, string>) => keyColumns.map((k) => r[k]).join(" / ");
  for (const r of d.removed) out.push(["削除", key(r), "", JSON.stringify(r), ""]);
  for (const r of d.added) out.push(["追加", key(r), "", "", JSON.stringify(r)]);
  for (const c of d.changed) for (const ch of c.changes) out.push(["変更", c.key, ch.column, ch.before, ch.after]);
  return out;
}
