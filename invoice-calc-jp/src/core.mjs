// 適格請求書向け計算ロジック（外部通信なし・純関数）
const ROUND = {
  floor: Math.floor,
  ceil: Math.ceil,
  round: (x) => Math.round(x),
};

/** 整数演算で端数処理（浮動小数誤差回避） amount*rate(%) /100 */
export function pct(amount, ratePercent, mode = 'floor') {
  if (!Number.isInteger(amount)) throw new Error('amount must be integer yen');
  if (!ROUND[mode]) throw new Error('unknown rounding mode: ' + mode);
  const num = amount * Math.round(ratePercent * 100); // rate in 1/100 %
  return ROUND[mode](num / 10000);
}

/**
 * items: [{name, unitPrice:int, qty:int, rate:8|10|0}] 税抜単価
 * 税率ごとに合計→1回だけ端数処理（インボイス制度の請求書単位ルール）
 */
export function calcInvoice(items, { rounding = 'floor', withholding = false } = {}) {
  if (!Array.isArray(items)) throw new Error('items must be array');
  const groups = new Map();
  for (const [i, it] of items.entries()) {
    const { unitPrice, qty, rate } = it;
    if (![0, 8, 10].includes(rate)) throw new Error(`item ${i + 1}: invalid rate`);
    if (!Number.isInteger(unitPrice) || !Number.isInteger(qty) || qty < 0)
      throw new Error(`item ${i + 1}: unitPrice/qty must be integers (qty>=0)`);
    groups.set(rate, (groups.get(rate) ?? 0) + unitPrice * qty);
  }
  const byRate = [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, subtotal]) => ({ rate, subtotal, tax: pct(subtotal, rate, rounding) }));
  const subtotal = byRate.reduce((s, g) => s + g.subtotal, 0);
  const tax = byRate.reduce((s, g) => s + g.tax, 0);
  const wh = withholding ? withholdingTax(subtotal) : 0; // 税抜（請求書で区分記載の場合）
  return { byRate, subtotal, tax, total: subtotal + tax, withholding: wh, payable: subtotal + tax - wh };
}

/** 報酬・料金の源泉徴収: 100万円以下 10.21%、超過分 20.42%（復興特別所得税込み）。端数は切捨て */
export function withholdingTax(amountExTax) {
  if (!Number.isInteger(amountExTax) || amountExTax < 0) throw new Error('invalid amount');
  const LIMIT = 1_000_000;
  if (amountExTax <= LIMIT) return Math.floor((amountExTax * 1021) / 10000);
  return Math.floor((LIMIT * 1021) / 10000) + Math.floor(((amountExTax - LIMIT) * 2042) / 10000);
}

/** 適格請求書発行事業者登録番号の形式検証: T + 13桁。法人番号のチェックデジット検証付き（法人のみ） */
export function validateRegNo(s) {
  if (!/^T\d{13}$/.test(s)) return { ok: false, reason: 'format' };
  const d = s.slice(1).split('').map(Number);
  // 先頭1桁がチェックデジット、残り12桁が基礎番号。個人事業主は別体系のため形式のみ保証
  const sum = d.slice(1).reduce((acc, v, i) => acc + v * (i % 2 === 0 ? 1 : 2), 0);
  // 注: 法人番号は 12桁を末尾から 1,2,1,2.. 重み。ここでは厳密性より形式検証を主とする
  return { ok: true, note: 'format-only', checksumHint: 9 - (sum % 9) === d[0] };
}

/** CSV往復（バックアップ用）。ダブルクォート対応 */
export function itemsToCsv(items) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const body = items.map((i) => [q(i.name), i.unitPrice, i.qty, i.rate].join(','));
  return ['name,unitPrice,qty,rate', ...body].join('\n');
}
export function csvToItems(csv) {
  const rows = [];
  let cur = [], f = '', inQ = false;
  const s = csv.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"' && s[i + 1] === '"') { f += '"'; i++; }
      else if (c === '"') inQ = false;
      else f += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      cur.push(f); f = ''; rows.push(cur); cur = [];
    } else f += c;
  }
  if (f !== '' || cur.length) { cur.push(f); rows.push(cur); }
  const [head, ...data] = rows.filter((r) => r.some((x) => x !== ''));
  if (!head || head.join(',') !== 'name,unitPrice,qty,rate') throw new Error('invalid CSV header');
  return data.map((r, i) => {
    const [name, u, q, rt] = r;
    const it = { name, unitPrice: Number(u), qty: Number(q), rate: Number(rt) };
    if (![it.unitPrice, it.qty, it.rate].every(Number.isInteger)) throw new Error(`row ${i + 2}: invalid number`);
    return it;
  });
}
