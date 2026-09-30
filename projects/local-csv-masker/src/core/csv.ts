export type Delimiter = ',' | '\t' | ';';

export function detectDelimiter(text: string): Delimiter {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const count = (c: string) => firstLine.split(c).length - 1;
  const candidates: Delimiter[] = [',', '\t', ';'];
  let best: Delimiter = ',';
  let bestCount = 0;
  for (const c of candidates) {
    if (count(c) > bestCount) {
      best = c;
      bestCount = count(c);
    }
  }
  return best;
}

/** RFC4180 準拠の簡易パーサ。引用符内の改行・"" エスケープに対応。 */
export function parseCsv(input: string, delimiter: Delimiter = ','): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
    i++;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function stringifyCsv(rows: string[][], delimiter: Delimiter = ',', eol = '\r\n'): string {
  const esc = (v: string) =>
    v.includes('"') || v.includes(delimiter) || /[\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return rows.map((r) => r.map(esc).join(delimiter)).join(eol) + (rows.length ? eol : '');
}
