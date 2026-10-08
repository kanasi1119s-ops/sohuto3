export type Row = string[];

/** RFC4180 準拠の簡易パーサ(引用符内の改行・"" エスケープ対応)。 */
export function parseCsv(text: string, delimiter = ","): Row[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: Row[] = [];
  let row: Row = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  const pushRow = () => {
    row.push(cell);
    cell = "";
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += c; i++; continue;
    }
    if (c === '"' && cell === "") { inQuotes = true; i++; continue; }
    if (c === delimiter) { row.push(cell); cell = ""; i++; continue; }
    if (c === "\r") { pushRow(); i += text[i + 1] === "\n" ? 2 : 1; continue; }
    if (c === "\n") { pushRow(); i++; continue; }
    cell += c; i++;
  }
  if (cell !== "" || row.length > 0) pushRow();
  return rows;
}

export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/, 5).join("\n");
  const counts = [",", "\t", ";"].map((d) => [d, head.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

/** CSVインジェクション対策: 数式として解釈され得る先頭文字を無害化する。 */
export function neutralizeFormula(v: string): string {
  return /^(?:[=+@]|-(?!\d))/.test(v) ? "'" + v : v;
}

export function stringifyCsv(rows: Row[], opts: { safe?: boolean } = {}): string {
  const esc = (v: string) => {
    const s = opts.safe ? neutralizeFormula(v) : v;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}
