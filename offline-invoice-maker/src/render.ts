import { calcTotals, yen } from './calc';
import type { Invoice, Settings } from './store';

export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const nl2br = (s: string): string => esc(s).replace(/\n/g, '<br>');

export function renderInvoice(inv: Invoice, s: Settings): string {
  const t = calcTotals(inv.lines, s.rounding, s.withholding);
  const rows = inv.lines
    .map(
      (l, i) =>
        `<tr><td>${esc(l.name)}${l.taxRate === 8 ? ' ※' : ''}</td><td class="num">${l.qty}</td>` +
        `<td class="num">${yen(l.unitPrice)}</td><td class="num">${l.taxRate}%</td><td class="num">${yen(t.lineAmounts[i] ?? 0)}</td></tr>`,
    )
    .join('');
  const rates = t.byRate
    .map((r) => `<tr><td>${r.rate}%対象${r.rate === 8 ? '（※軽減税率）' : ''}</td><td class="num">${yen(r.subtotal)}</td><td class="num">消費税 ${yen(r.tax)}</td></tr>`)
    .join('');
  return `<article class="doc">
<h2>請求書</h2>
<div class="meta"><div>請求書番号: ${esc(inv.number)}</div><div>発行日: ${esc(inv.issueDate)}</div><div>お支払期限: ${esc(inv.dueDate)}</div></div>
<div class="parties"><div><strong>${esc(inv.clientName)} 御中</strong></div>
<div class="issuer"><strong>${esc(s.issuerName)}</strong><br>${nl2br(s.issuerAddress)}<br>${s.registrationNumber ? `登録番号: ${esc(s.registrationNumber)}` : '<span class="warn">登録番号 未設定</span>'}</div></div>
<p class="big">ご請求金額（税込）: <strong>${yen(t.total)}</strong></p>
<table class="items"><thead><tr><th>品目</th><th>数量</th><th>単価(税抜)</th><th>税率</th><th>金額(税抜)</th></tr></thead><tbody>${rows}</tbody></table>
<table class="sum"><tbody>${rates}<tr><td>合計</td><td class="num">${yen(t.subtotal)}</td><td class="num">消費税 ${yen(t.tax)}</td></tr>
${s.withholding ? `<tr><td>源泉徴収税額</td><td></td><td class="num">-${yen(t.withholding)}</td></tr><tr><td>差引お支払額</td><td></td><td class="num"><strong>${yen(t.payable)}</strong></td></tr>` : ''}</tbody></table>
${s.bankInfo ? `<p><strong>お振込先</strong><br>${nl2br(s.bankInfo)}</p>` : ''}
${inv.note ? `<p>${nl2br(inv.note)}</p>` : ''}
</article>`;
}
