#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseCsv, calculate } from './calc.js';

const args = process.argv.slice(2);
const mode = args.includes('--round') ? args[args.indexOf('--round') + 1] ?? '' : 'floor';
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--round');
if (!file || args.includes('--help')) {
  console.log('usage: invoice-tax-calc <items.csv> [--round floor|round|ceil] [--json]\ncolumns: name,unit_price,quantity,tax_rate(%)');
  process.exit(file ? 0 : 1);
}
try {
  const r = calculate(parseCsv(readFileSync(file, 'utf8')), mode);
  if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    for (const g of r.groups) console.log(`${g.rate}%対象 小計 ${g.subtotal} 消費税 ${g.tax}`);
    console.log(`小計 ${r.subtotal} 税額 ${r.tax} 合計 ${r.total}`);
  }
} catch (e) { console.error(`error: ${e.message}`); process.exit(2); }
