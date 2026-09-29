import './style.css';
import { calcTotals, isValidRegistrationNumber, validateLine, type Line, type Rounding } from './calc';
import { exportCsv, exportJson, importJson, load, save, type AppData, type Invoice } from './store';
import { esc, renderInvoice } from './render';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
};

let data: AppData = load();
let current: Invoice = blank();

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextNumber(): string {
  const used = new Set((data?.invoices ?? []).map((i) => i.number));
  const base = `INV-${today().replace(/-/g, '')}`;
  let n = 1;
  while (used.has(`${base}-${String(n).padStart(2, '0')}`)) n++;
  return `${base}-${String(n).padStart(2, '0')}`;
}

function blank(): Invoice {
  return {
    id: crypto.randomUUID(),
    number: nextNumber(),
    issueDate: today(),
    dueDate: '',
    clientName: '',
    note: '',
    lines: [{ name: '', qty: 1, unitPrice: 0, taxRate: 10 }],
    updatedAt: '',
  };
}

function msg(text: string, isErr = false): void {
  const el = $('msg');
  el.textContent = text;
  el.className = isErr ? 'err' : '';
}

function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function persist(): boolean {
  try {
    save(data);
    return true;
  } catch {
    msg('保存に失敗しました（ブラウザの保存容量またはプライベートモードの制限）。JSONバックアップを取得してください。', true);
    return false;
  }
}

function readSettingsForm(): void {
  const reg = $<HTMLInputElement>('s-reg').value.trim();
  const ok = reg === '' || isValidRegistrationNumber(reg);
  $('s-reg-err').textContent = ok ? '' : 'T+数字13桁で入力してください';
  data.settings = {
    issuerName: $<HTMLInputElement>('s-name').value,
    issuerAddress: $<HTMLTextAreaElement>('s-addr').value,
    registrationNumber: ok ? reg : data.settings.registrationNumber,
    bankInfo: $<HTMLTextAreaElement>('s-bank').value,
    rounding: $<HTMLSelectElement>('s-round').value as Rounding,
    withholding: $<HTMLInputElement>('s-wh').checked,
  };
  persist();
  refresh();
}

function writeSettingsForm(): void {
  const s = data.settings;
  $<HTMLInputElement>('s-name').value = s.issuerName;
  $<HTMLInputElement>('s-reg').value = s.registrationNumber;
  $<HTMLTextAreaElement>('s-addr').value = s.issuerAddress;
  $<HTMLTextAreaElement>('s-bank').value = s.bankInfo;
  $<HTMLSelectElement>('s-round').value = s.rounding;
  $<HTMLInputElement>('s-wh').checked = s.withholding;
}

function readEditor(): void {
  current.number = $<HTMLInputElement>('e-number').value;
  current.clientName = $<HTMLInputElement>('e-client').value;
  current.issueDate = $<HTMLInputElement>('e-issue').value;
  current.dueDate = $<HTMLInputElement>('e-due').value;
  current.note = $<HTMLTextAreaElement>('e-note').value;
  const rows = Array.from($('lines').querySelectorAll('tbody tr'));
  current.lines = rows.map((tr) => ({
    name: (tr.querySelector('.l-name') as HTMLInputElement).value,
    qty: Number((tr.querySelector('.l-qty') as HTMLInputElement).value),
    unitPrice: Number((tr.querySelector('.l-price') as HTMLInputElement).value),
    taxRate: (tr.querySelector('.l-rate') as HTMLSelectElement).value === '8' ? 8 : 10,
  }));
}

function writeEditor(): void {
  $<HTMLInputElement>('e-number').value = current.number;
  $<HTMLInputElement>('e-client').value = current.clientName;
  $<HTMLInputElement>('e-issue').value = current.issueDate;
  $<HTMLInputElement>('e-due').value = current.dueDate;
  $<HTMLTextAreaElement>('e-note').value = current.note;
  const tbody = $('lines').querySelector('tbody') as HTMLTableSectionElement;
  tbody.innerHTML = '';
  current.lines.forEach((l) => addLineRow(l));
}

function addLineRow(l: Line): void {
  const tbody = $('lines').querySelector('tbody') as HTMLTableSectionElement;
  const tr = document.createElement('tr');
  tr.innerHTML =
    `<td><input class="l-name" aria-label="品目" maxlength="200"></td>` +
    `<td><input class="l-qty" aria-label="数量" type="number" min="0" step="0.001"></td>` +
    `<td><input class="l-price" aria-label="単価" type="number" min="0" step="1"></td>` +
    `<td><select class="l-rate" aria-label="税率"><option value="10">10%</option><option value="8">8%（軽減）</option></select></td>` +
    `<td><button type="button" class="l-del" aria-label="明細削除">×</button></td>`;
  (tr.querySelector('.l-name') as HTMLInputElement).value = l.name;
  (tr.querySelector('.l-qty') as HTMLInputElement).value = String(l.qty);
  (tr.querySelector('.l-price') as HTMLInputElement).value = String(l.unitPrice);
  (tr.querySelector('.l-rate') as HTMLSelectElement).value = String(l.taxRate);
  tr.querySelector('.l-del')?.addEventListener('click', () => {
    if (tbody.rows.length > 1) tr.remove();
    onEdit();
  });
  tbody.appendChild(tr);
}

function firstError(): string | null {
  for (const [i, l] of current.lines.entries()) {
    const e = validateLine(l);
    if (e) return `明細${i + 1}: ${e}`;
  }
  return null;
}

function onEdit(): void {
  readEditor();
  const err = firstError();
  $('line-err').textContent = err ?? '';
  refresh();
}

function refresh(): void {
  const err = firstError();
  $('preview').innerHTML = err ? '' : renderInvoice(current, data.settings);
  const ul = $('list');
  ul.innerHTML = '';
  for (const inv of data.invoices) {
    const li = document.createElement('li');
    const t = calcTotals(inv.lines, data.settings.rounding, data.settings.withholding);
    li.innerHTML = `<span>${esc(inv.number)} / ${esc(inv.clientName || '(請求先未入力)')} / ¥${t.total.toLocaleString('ja-JP')}</span>` +
      `<button type="button" class="open">開く</button><button type="button" class="del">削除</button>`;
    li.querySelector('.open')?.addEventListener('click', () => {
      current = structuredClone(inv);
      writeEditor();
      onEdit();
    });
    li.querySelector('.del')?.addEventListener('click', () => {
      if (!confirm(`${inv.number} を削除しますか？`)) return;
      data.invoices = data.invoices.filter((x) => x.id !== inv.id);
      if (persist()) msg('削除しました');
      refresh();
    });
    ul.appendChild(li);
  }
}

function init(): void {
  writeSettingsForm();
  writeEditor();
  refresh();
  document.querySelectorAll('#settings-box input, #settings-box textarea, #settings-box select').forEach((el) => {
    el.addEventListener('input', readSettingsForm);
  });
  $('editor').addEventListener('input', onEdit);
  $('add-line').addEventListener('click', () => {
    addLineRow({ name: '', qty: 1, unitPrice: 0, taxRate: 10 });
    onEdit();
  });
  $('new-inv').addEventListener('click', () => {
    current = blank();
    writeEditor();
    onEdit();
  });
  $('save-inv').addEventListener('click', () => {
    readEditor();
    const err = firstError();
    if (err) return msg(err, true);
    current.updatedAt = new Date().toISOString();
    const i = data.invoices.findIndex((x) => x.id === current.id);
    if (i >= 0) data.invoices[i] = structuredClone(current);
    else data.invoices.push(structuredClone(current));
    if (persist()) msg('保存しました');
    refresh();
  });
  $('print-inv').addEventListener('click', () => window.print());
  $('export-json').addEventListener('click', () => download('invoices-backup.json', exportJson(data), 'application/json'));
  $('export-csv').addEventListener('click', () =>
    download('invoices.csv', exportCsv(data, (i) => calcTotals(i.lines, data.settings.rounding, data.settings.withholding).total), 'text/csv'),
  );
  $<HTMLInputElement>('import-json').addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('ファイルが大きすぎます（5MBまで）');
      if (!confirm('現在のデータを読み込み内容で置き換えます。よろしいですか？')) return;
      data = importJson(await file.text());
      if (persist()) msg(`読み込みました（請求書 ${data.invoices.length} 件）`);
      writeSettingsForm();
      current = blank();
      writeEditor();
      refresh();
    } catch (err) {
      msg(`読み込みに失敗しました: ${err instanceof Error ? err.message : String(err)}`, true);
    } finally {
      input.value = '';
    }
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

init();
