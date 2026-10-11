import './style.css';
import { DOC_TYPES, type DocType, type RecordMeta } from './core/types';
import { assignFileNames, validate } from './core/naming';
import { buildIndexCsv } from './core/csv';
import { createZip, readZip } from './core/zip';
import { clearAll, loadAll, put, remove, type StoredRecord } from './store';

const MAX_FILE = 50 * 1024 * 1024;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let records: StoredRecord[] = [];
const derived = new Map<string, { name: HTMLElement; err: HTMLElement }>();

function say(text: string) { $('msg').textContent = text; }
const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

async function addFiles(files: File[]) {
  let skipped = 0;
  for (const f of files) {
    if (f.size > MAX_FILE || f.size === 0) { skipped++; continue; }
    const r: StoredRecord = { id: uid(), originalName: f.name, date: today(), vendor: '', amount: '', type: '領収書', regNo: '', blob: f };
    records.push(r);
    await put(r);
  }
  say(skipped ? `${skipped}件は空または50MB超のため追加しませんでした。` : `${files.length}件を追加しました。`);
  render();
}

function field(label: string, el: HTMLElement) {
  const l = document.createElement('label'); l.className = 'f'; l.append(label, el); return l;
}

function render() {
  const ul = $('list'); ul.replaceChildren(); derived.clear();
  records.forEach((r) => {
    const li = document.createElement('li');
    const orig = document.createElement('div'); orig.className = 'orig'; orig.textContent = `元: ${r.originalName}`;
    const mk = (key: 'date' | 'vendor' | 'amount' | 'regNo', type: string, ph = '') => {
      const inp = document.createElement('input'); inp.type = type; inp.value = r[key]; inp.placeholder = ph;
      inp.dataset.key = key;
      inp.addEventListener('change', async () => { r[key] = inp.value; await put(r); refresh(); });
      return inp;
    };
    const sel = document.createElement('select'); sel.dataset.key = 'type';
    for (const t of DOC_TYPES) { const o = document.createElement('option'); o.value = o.textContent = t; sel.append(o); }
    sel.value = r.type;
    sel.addEventListener('change', async () => { r.type = sel.value as DocType; await put(r); refresh(); });
    const fields = document.createElement('div'); fields.className = 'fields';
    fields.append(field('取引日', mk('date', 'date')), field('取引先', mk('vendor', 'text', '株式会社〇〇')),
      field('金額(円)', mk('amount', 'text', '11000')), field('種別', sel), field('登録番号(任意)', mk('regNo', 'text', 'T1234567890123')));
    const nm = document.createElement('div'); nm.className = 'name';
    const er = document.createElement('div'); er.className = 'err';
    derived.set(r.id, { name: nm, err: er });
    li.append(orig, fields, nm, er);
    const del = document.createElement('button'); del.type = 'button'; del.textContent = '削除'; del.className = 'danger';
    del.addEventListener('click', async () => { records = records.filter((x) => x.id !== r.id); await remove(r.id); render(); });
    li.append(del);
    ul.append(li);
  });
  refresh();
}

/** 入力欄を作り直さずに、保存名・エラー表示・書き出しボタンだけ更新する(フォーカス/入力を失わないため) */
function refresh() {
  const names = assignFileNames(records);
  records.forEach((r, i) => {
    const d = derived.get(r.id);
    if (!d) return;
    d.name.textContent = names[i] ?? '(入力が完了すると保存名が表示されます)';
    const errs = validate(r);
    d.err.textContent = errs.length && r.vendor + r.amount !== '' ? errs.join(' / ') : '';
  });
  ($('export') as HTMLButtonElement).disabled = records.length === 0 || names.some((n) => n === null);
}

function download(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportZip() {
  const names = assignFileNames(records);
  if (names.some((n) => n === null)) { say('未入力・不正な項目があるため書き出せません。'); return; }
  const entries = [];
  for (let i = 0; i < records.length; i++) entries.push({ name: `files/${names[i]}`, data: new Uint8Array(await records[i].blob.arrayBuffer()) });
  const te = new TextEncoder();
  entries.push({ name: 'index.csv', data: te.encode(buildIndexCsv(records, names)) });
  const manifest = records.map((r, i) => ({ file: `files/${names[i]}`, originalName: r.originalName, date: r.date, vendor: r.vendor, amount: r.amount, type: r.type, regNo: r.regNo }));
  entries.push({ name: 'manifest.json', data: te.encode(JSON.stringify({ app: 'receipt-namer-offline', version: 1, records: manifest }, null, 2)) });
  download(createZip(entries), `receipts-${today()}.zip`);
  say(`${records.length}件を書き出しました。`);
}

async function importZip(file: File) {
  try {
    const entries = readZip(new Uint8Array(await file.arrayBuffer()));
    const mf = entries.find((e) => e.name === 'manifest.json');
    if (!mf) throw new Error('manifest.json が見つかりません');
    const parsed = JSON.parse(new TextDecoder().decode(mf.data));
    if (parsed?.app !== 'receipt-namer-offline' || !Array.isArray(parsed.records)) throw new Error('本アプリのバックアップではありません');
    let n = 0;
    for (const m of parsed.records) {
      const e = entries.find((x) => x.name === m.file);
      if (!e || typeof m.originalName !== 'string' || !(DOC_TYPES as readonly string[]).includes(m.type)) continue;
      const r: StoredRecord = { id: uid(), originalName: m.originalName, date: String(m.date), vendor: String(m.vendor), amount: String(m.amount), type: m.type, regNo: String(m.regNo ?? ''), blob: new Blob([e.data as BlobPart]) };
      records.push(r); await put(r); n++;
    }
    say(`${n}件を読み込みました。`);
    render();
  } catch (err) {
    say(`読み込みに失敗しました: ${(err as Error).message}`);
  }
}

async function init() {
  records = await loadAll();
  render();
  const drop = $('drop');
  const input = $<HTMLInputElement>('file');
  input.addEventListener('change', () => { void addFiles([...(input.files ?? [])]); input.value = ''; });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); void addFiles([...(e.dataTransfer?.files ?? [])]); });
  $('export').addEventListener('click', () => void exportZip());
  const imp = $<HTMLInputElement>('import');
  imp.addEventListener('change', () => { const f = imp.files?.[0]; if (f) void importZip(f); imp.value = ''; });
  $('clear').addEventListener('click', async () => { if (records.length && confirm('保存済みのデータをすべて削除します。よろしいですか?')) { records = []; await clearAll(); render(); say('削除しました。'); } });
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
void init();
export type { RecordMeta };
