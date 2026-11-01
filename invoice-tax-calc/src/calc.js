// 税率ごとに合計し、税額の端数処理は請求書1枚・税率ごとに1回だけ行う。
const MODES = { floor: Math.floor, round: Math.round, ceil: Math.ceil };

export function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) throw new Error('CSV is empty');
  const header = lines[0].split(',').map((h) => h.trim());
  for (const k of ['name', 'unit_price', 'quantity', 'tax_rate']) {
    if (!header.includes(k)) throw new Error(`missing column: ${k}`);
  }
  return lines.slice(1).map((line, i) => {
    const cells = line.split(',').map((c) => c.trim());
    const row = Object.fromEntries(header.map((h, j) => [h, cells[j] ?? '']));
    const unit = Number(row.unit_price), qty = Number(row.quantity), rate = Number(row.tax_rate);
    if (![unit, qty, rate].every(Number.isFinite) || row.unit_price === '' || row.quantity === '' || row.tax_rate === '')
      throw new Error(`line ${i + 2}: invalid number`);
    if (qty < 0 || unit < 0 || rate < 0) throw new Error(`line ${i + 2}: negative value`);
    return { name: row.name, unit, qty, rate };
  });
}

export function calculate(items, mode = 'floor') {
  const fn = MODES[mode];
  if (!fn) throw new Error(`unknown rounding mode: ${mode}`);
  const byRate = new Map();
  for (const it of items) byRate.set(it.rate, (byRate.get(it.rate) ?? 0) + Math.round(it.unit * it.qty * 100) / 100);
  const groups = [...byRate].sort((a, b) => b[0] - a[0]).map(([rate, subtotal]) => {
    const tax = fn(Math.round(subtotal * rate) / 100);
    return { rate, subtotal, tax };
  });
  const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  const tax = groups.reduce((s, g) => s + g.tax, 0);
  return { groups, subtotal, tax, total: subtotal + tax };
}
