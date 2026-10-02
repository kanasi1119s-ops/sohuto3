import './style.css';
import { totals, upcoming, monthlyCost } from './core/calc';
import { exportCsv, exportJson, importJson } from './core/io';
import { MAX_ITEMS, type Subscription } from './core/model';
import { normalize, validateSubscription } from './core/validate';
import { load, newId, save } from './storage';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');
const CYCLE_LABEL = { weekly: '毎週', monthly: '毎月', quarterly: '3か月ごと', yearly: '毎年' } as const;

let subs: Subscription[] = load();
let editingId: string | null = null;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function say(text: string, err = false) {
  const m = $('msg');
  m.textContent = text;
  m.className = err ? 'err' : '';
}
function persist(): boolean {
  const ok = save(subs);
  if (!ok) say('保存に失敗しました。ブラウザの保存領域を確認し、JSONで書き出してバックアップしてください。', true);
  return ok;
}

function li(s: Subscription, extra?: string): HTMLLIElement {
  const el = document.createElement('li');
  el.className = 'item' + (s.active ? '' : ' off');
  el.dataset.id = s.id;
  const left = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = s.name;
  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = `${yen(s.amount)} / ${CYCLE_LABEL[s.cycle]}（月額換算 ${yen(monthlyCost(s))}）・次回 ${extra ?? s.nextBilling}${s.category ? '・' + s.category : ''}${s.active ? '' : '・停止中'}`;
  left.append(name, sub);
  el.append(left);
  return el;
}

function render() {
  const t = totals(subs);
  $('t-monthly').textContent = yen(t.monthly);
  $('t-yearly').textContent = yen(t.yearly);
  $('t-count').textContent = String(t.count);

  const up = $('upcoming');
  up.replaceChildren(...upcoming(subs, today(), 7).map((s) => li(s)));
  if (!up.children.length) {
    const e = document.createElement('li');
    e.className = 'sub';
    e.textContent = 'ありません';
    up.append(e);
  }

  const list = $('list');
  list.replaceChildren(
    ...subs.map((s) => {
      const el = li(s);
      const row = document.createElement('div');
      row.className = 'row';
      const mk = (label: string, cls: string, fn: () => void) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.className = cls;
        b.dataset.action = label;
        b.addEventListener('click', fn);
        return b;
      };
      row.append(
        mk('編集', 'secondary', () => startEdit(s)),
        mk(s.active ? '停止' : '再開', 'secondary', () => { s.active = !s.active; persist(); render(); }),
        mk('削除', 'secondary', () => {
          if (!confirm(`「${s.name}」を削除しますか？`)) return;
          subs = subs.filter((x) => x.id !== s.id);
          persist();
          render();
        }),
      );
      el.append(row);
      return el;
    }),
  );
}

const form = $<HTMLFormElement>('form');
function startEdit(s: Subscription) {
  editingId = s.id;
  for (const k of ['name', 'amount', 'cycle', 'nextBilling', 'category', 'note'] as const)
    (form.elements.namedItem(k) as HTMLInputElement).value = String(s[k]);
  $('form-title').textContent = '編集';
  $('submit').textContent = '更新する';
  $('cancel').hidden = false;
  form.scrollIntoView();
}
function resetForm() {
  editingId = null;
  form.reset();
  $('form-title').textContent = '追加';
  $('submit').textContent = '追加する';
  $('cancel').hidden = true;
}
$('cancel').addEventListener('click', resetForm);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const raw = {
    name: String(fd.get('name') ?? ''),
    amount: fd.get('amount') === '' ? NaN : Number(fd.get('amount')),
    cycle: fd.get('cycle'),
    nextBilling: fd.get('nextBilling'),
    category: String(fd.get('category') ?? ''),
    note: String(fd.get('note') ?? ''),
  };
  const err = validateSubscription(raw);
  if (err) return say(err, true);
  if (editingId) {
    const cur = subs.find((x) => x.id === editingId);
    if (cur) Object.assign(cur, normalize({ ...raw, active: cur.active }, cur.id));
  } else {
    if (subs.length >= MAX_ITEMS) return say(`登録は${MAX_ITEMS}件までです`, true);
    subs.push(normalize(raw, newId()));
  }
  if (persist()) say(editingId ? '更新しました' : '追加しました');
  resetForm();
  render();
});

function download(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export-json').addEventListener('click', () => download('subscriptions.json', 'application/json', exportJson(subs)));
$('export-csv').addEventListener('click', () => download('subscriptions.csv', 'text/csv', exportCsv(subs)));
$<HTMLInputElement>('import').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.size > 10_000_000) return say('ファイルが大きすぎます（10MBまで）', true);
  const r = importJson(await file.text(), newId);
  if (!r.ok) return say(r.error, true);
  if (!confirm(`現在のデータ(${subs.length}件)を、読み込んだ${r.items.length}件で置き換えます。よろしいですか？`)) return;
  subs = r.items;
  if (persist()) say(`${r.items.length}件を読み込みました`);
  render();
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
render();
