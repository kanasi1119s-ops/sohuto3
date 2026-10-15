import { guessFromFilename } from './core/guess';
import { resolveRows, ledgerCsv, type Row } from './core/rows';
import { createZip } from './core/zip';
import { dictFromCsv, dictToCsv, type Dict } from './core/dict';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const files = new Map<number, File>();
let rows: Row[] = [];
let nextId = 1;
let dict: Dict = loadDict();

function loadDict(): Dict {
  try {
    const raw = JSON.parse(localStorage.getItem('dict') || '{}');
    return raw && typeof raw === 'object' ? (raw as Dict) : {};
  } catch { return {}; }
}
function saveDict() {
  try { localStorage.setItem('dict', JSON.stringify(dict)); } catch { /* 保存不可環境では無視 */ }
}

function addFiles(list: FileList | File[]) {
  for (const f of Array.from(list)) {
    const g = guessFromFilename(f.name);
    const id = nextId++;
    files.set(id, f);
    rows.push({ id, originalName: f.name, date: g.date, vendor: g.vendor, amount: g.amount, kind: ($('bulkKind') as HTMLInputElement).value });
  }
  render();
}

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function render() {
  $('listSec').hidden = rows.length === 0;
  const res = resolveRows(rows, dict);
  const tbody = $('rows');
  tbody.textContent = '';
  for (const r of res) {
    const tr = document.createElement('tr');
    tr.dataset.id = String(r.row.id);
    const orig = document.createElement('td'); orig.textContent = r.row.originalName; tr.appendChild(orig);
    for (const f of ['date', 'vendor', 'amount', 'kind'] as const) {
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.value = r.row[f]; inp.dataset.field = f; inp.setAttribute('aria-label', f);
      if (f === 'date') inp.placeholder = '2026-10-15 / 令和8年10月15日';
      if (f === 'amount') inp.inputMode = 'numeric';
      inp.addEventListener('input', () => {
        r.row[f] = inp.value;
        refresh(); // 入力欄は再生成しない(日本語IMEの変換中に壊れるため)
      });
      td.appendChild(inp); tr.appendChild(td);
    }
    const nm = document.createElement('td');
    nm.dataset.role = 'name';
    tr.appendChild(nm);
    const del = document.createElement('td');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn sub'; b.textContent = '削除'; b.setAttribute('aria-label', `${r.row.originalName} を削除`);
    b.addEventListener('click', () => { rows = rows.filter((x) => x.id !== r.row.id); files.delete(r.row.id); render(); });
    del.appendChild(b); tr.appendChild(del);
    tbody.appendChild(tr);
  }
  refresh();
  renderDict();
}

/** 計算結果(新ファイル名・エラー・ボタン状態)だけを更新する。入力欄には触れない。 */
function refresh() {
  const res = resolveRows(rows, dict);
  for (const r of res) {
    const nm = $('rows').querySelector<HTMLElement>(`tr[data-id="${r.row.id}"] td[data-role="name"]`);
    if (!nm) continue;
    nm.className = r.newName ? 'name' : 'err';
    nm.textContent = r.newName ?? r.errors.join(' / ');
  }
  const okCount = res.filter((r) => r.newName).length;
  $('summary').textContent = rows.length ? `${rows.length}件中 ${okCount}件が命名可能${okCount < rows.length ? '(未入力・不正な行があります)' : ''}` : '';
  ($('zip') as HTMLButtonElement).disabled = rows.length === 0 || okCount !== rows.length;
  ($('csv') as HTMLButtonElement).disabled = okCount === 0;
}

function renderDict() {
  const ul = $('dictList');
  ul.textContent = '';
  for (const [a, c] of Object.entries(dict)) {
    const li = document.createElement('li');
    li.textContent = `${a} → ${c} `;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn sub'; b.textContent = '削除';
    b.addEventListener('click', () => { delete dict[a]; saveDict(); render(); });
    li.appendChild(b); ul.appendChild(li);
  }
}

$('file').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.files) addFiles(input.files);
  input.value = '';
});
const drop = $('drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault(); drop.classList.remove('over');
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
});
$('applyKind').addEventListener('click', () => {
  const k = ($('bulkKind') as HTMLInputElement).value;
  rows.forEach((r) => (r.kind = k)); render();
});
$('clear').addEventListener('click', () => {
  if (rows.length && !confirm('一覧をすべてクリアします。よろしいですか?')) return;
  rows = []; files.clear(); render();
});
$('csv').addEventListener('click', () => {
  download('ledger.csv', ledgerCsv(resolveRows(rows, dict)), 'text/csv;charset=utf-8');
});
$('zip').addEventListener('click', async () => {
  const res = resolveRows(rows, dict);
  if (res.some((r) => !r.newName)) return;
  const btn = $('zip') as HTMLButtonElement;
  btn.disabled = true;
  try {
    const items = [];
    for (const r of res) {
      const f = files.get(r.row.id)!;
      items.push({ name: r.newName!, data: new Uint8Array(await f.arrayBuffer()), date: new Date(f.lastModified) });
    }
    items.push({ name: '索引台帳.csv', data: new TextEncoder().encode(ledgerCsv(res)) });
    download('denchou-data.zip', createZip(items) as BlobPart, 'application/zip');
  } catch (e) {
    alert('ZIPの作成に失敗しました: ' + (e instanceof Error ? e.message : String(e)));
  } finally { btn.disabled = false; }
});
$('addDict').addEventListener('click', () => {
  const a = ($('alias') as HTMLInputElement).value.trim();
  const c = ($('canon') as HTMLInputElement).value.trim();
  if (!a || !c || a === '__proto__') return;
  dict[a] = c; saveDict();
  ($('alias') as HTMLInputElement).value = ''; ($('canon') as HTMLInputElement).value = '';
  render();
});
$('dictExport').addEventListener('click', () => download('vendor-dict.csv', dictToCsv(dict), 'text/csv;charset=utf-8'));
$('dictImport').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  if (f.size > 5_000_000) { alert('辞書ファイルが大きすぎます(5MBまで)'); input.value = ''; return; }
  dict = { ...dict, ...dictFromCsv(await f.text()) }; saveDict(); input.value = ''; render();
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !import.meta.env.DEV) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* オフライン機能なしで続行 */ });
}
render();
