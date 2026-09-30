import './style.css';
import { detectDelimiter, parseCsv, stringifyCsv, type Delimiter } from './core/csv';
import { PII_LABELS, PII_TYPES, type PiiType } from './core/detectors';
import { decodeBytes, encodeUtf8 } from './core/decode';
import {
  DEFAULT_PROFILE,
  maskPlainText,
  maskTable,
  parseProfile,
  type ColumnRule,
  type Findings,
  type Mode,
  type Options,
  type Profile,
} from './core/mask';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const STORE_KEY = 'csv-masker-profile';
const MAX_BYTES = 50 * 1024 * 1024;

let columnRules: Record<string, ColumnRule> = {}; // 列名 → ルール
let output = '';
let delimiter: Delimiter = ',';

function loadSaved(): Profile {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) return parseProfile(s);
  } catch {
    /* 保存領域が使えない/壊れている場合は既定値 */
  }
  return DEFAULT_PROFILE;
}

function save(p: Profile) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function currentTypes(): PiiType[] {
  return PII_TYPES.filter((t) => $<HTMLInputElement>(`type-${t}`).checked);
}

function currentWords(): string[] {
  return $<HTMLTextAreaElement>('words').value.split(/\r?\n/).map((w) => w.trim()).filter(Boolean);
}

function currentProfile(): Profile {
  return {
    version: 1,
    mode: $<HTMLSelectElement>('mode').value as Mode,
    types: currentTypes(),
    words: currentWords(),
    hasHeader: $<HTMLInputElement>('has-header').checked,
    columnRules,
  };
}

function applyProfile(p: Profile) {
  $<HTMLSelectElement>('mode').value = p.mode;
  for (const t of PII_TYPES) $<HTMLInputElement>(`type-${t}`).checked = p.types.includes(t);
  $<HTMLTextAreaElement>('words').value = p.words.join('\n');
  $<HTMLInputElement>('has-header').checked = p.hasHeader;
  columnRules = { ...p.columnRules };
}

function buildTypeBoxes() {
  const fs = $('types');
  for (const t of PII_TYPES) {
    const label = document.createElement('label');
    label.className = 'inline';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `type-${t}`;
    label.append(cb, ` ${PII_LABELS[t]}`);
    fs.append(label);
  }
}

function describe(f: Findings): string {
  const parts = PII_TYPES.filter((t) => f[t]).map((t) => `${PII_LABELS[t]} ${f[t]}件`);
  return parts.length ? `マスクした箇所: ${parts.join(' / ')}` : 'マスク対象は見つかりませんでした。';
}

function renderColumns(header: string[]) {
  const box = $('columns');
  box.replaceChildren();
  if (!header.length) return;
  const h = document.createElement('h3');
  h.textContent = '列ルール（自動＝中身を検出 / 保持 / 列ごとマスク / 削除）';
  box.append(h);
  header.forEach((name, i) => {
    const label = document.createElement('label');
    label.className = 'inline';
    const sel = document.createElement('select');
    sel.className = 'col-rule';
    sel.dataset.col = String(i);
    for (const [v, text] of [['auto', '自動'], ['keep', '保持'], ['mask', '列ごとマスク'], ['drop', '削除']]) {
      const o = document.createElement('option');
      o.value = v as string;
      o.textContent = text as string;
      sel.append(o);
    }
    sel.value = columnRules[name] ?? 'auto';
    sel.addEventListener('change', () => {
      columnRules[name] = sel.value as ColumnRule;
      run();
    });
    label.append(`${name || `列${i + 1}`}: `, sel);
    box.append(label);
  });
}

function renderPreview(rows: string[][], headerRow: boolean) {
  const table = $<HTMLTableElement>('preview');
  table.replaceChildren();
  rows.slice(0, 20).forEach((r, ri) => {
    const tr = document.createElement('tr');
    for (const cell of r) {
      const td = document.createElement(headerRow && ri === 0 ? 'th' : 'td');
      td.textContent = cell;
      tr.append(td);
    }
    table.append(tr);
  });
}

let lastHeaderKey = '';

function run() {
  const errorEl = $('error');
  errorEl.textContent = '';
  const profile = currentProfile();
  save(profile);
  const opts: Options = { mode: profile.mode, types: profile.types, words: profile.words };
  const text = $<HTMLTextAreaElement>('input').value;
  $<HTMLButtonElement>('download').disabled = true;
  if (text === '') {
    $('report').textContent = '';
    $('preview').replaceChildren();
    $('columns').replaceChildren();
    lastHeaderKey = '';
    output = '';
    return;
  }
  if (!$<HTMLInputElement>('mode-csv').checked) {
    const r = maskPlainText(text, opts);
    output = r.text;
    $('columns').replaceChildren();
    $('report').textContent = describe(r.findings);
    const t = $<HTMLTableElement>('preview');
    t.replaceChildren();
    const td = document.createElement('td');
    td.style.whiteSpace = 'pre-wrap';
    td.textContent = r.text.slice(0, 3000);
    const tr = document.createElement('tr');
    tr.append(td);
    t.append(tr);
    $<HTMLButtonElement>('download').disabled = false;
    return;
  }
  delimiter = detectDelimiter(text);
  const rows = parseCsv(text, delimiter);
  if (!rows.length) return;
  const header = profile.hasHeader ? (rows[0] ?? []) : [];
  const key = header.join('\u0000');
  if (key !== lastHeaderKey) {
    lastHeaderKey = key;
    renderColumns(header);
  }
  const idx: Record<number, ColumnRule> = {};
  header.forEach((name, i) => {
    idx[i] = columnRules[name] ?? 'auto';
  });
  const res = maskTable(rows, opts, profile.hasHeader, idx);
  output = stringifyCsv(res.rows, delimiter);
  $('report').textContent = `${rows.length}行を処理。 ${describe(res.findings)}`;
  renderPreview(res.rows, profile.hasHeader);
  $<HTMLButtonElement>('download').disabled = false;
}

async function onFile(file: File) {
  const err = $('error');
  err.textContent = '';
  if (file.size > MAX_BYTES) {
    err.textContent = 'ファイルが大きすぎます（上限50MB）。';
    return;
  }
  const { text, encoding } = decodeBytes(await file.arrayBuffer());
  $<HTMLTextAreaElement>('input').value = text;
  $('meta').textContent = `${file.name}（${encoding === 'utf-8' ? 'UTF-8' : 'Shift_JIS'}として読み込み）`;
  $<HTMLInputElement>('mode-csv').checked = !/\.txt$/i.test(file.name);
  lastHeaderKey = '';
  run();
}

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function init() {
  buildTypeBoxes();
  applyProfile(loadSaved());
  for (const id of ['mode', 'words', 'has-header', 'mode-csv', 'input']) {
    const ev = id === 'words' || id === 'input' ? 'input' : 'change';
    $(id).addEventListener(ev, () => {
      if (id === 'has-header' || id === 'input') lastHeaderKey = '';
      run();
    });
  }
  $('types').addEventListener('change', run);
  $<HTMLInputElement>('file').addEventListener('change', (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) void onFile(f);
  });
  $('download').addEventListener('click', () => {
    const bytes = encodeUtf8(output, $<HTMLInputElement>('bom').checked);
    const asCsv = $<HTMLInputElement>('mode-csv').checked;
    download(asCsv ? 'masked.csv' : 'masked.txt', bytes, asCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8');
  });
  $('export-profile').addEventListener('click', () => {
    download('csv-masker-profile.json', JSON.stringify(currentProfile(), null, 2), 'application/json');
  });
  $<HTMLInputElement>('import-profile').addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      applyProfile(parseProfile(await f.text()));
      lastHeaderKey = '';
      run();
    } catch (ex) {
      $('error').textContent = `設定を読み込めません: ${(ex as Error).message}`;
    }
  });
  run();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

init();
