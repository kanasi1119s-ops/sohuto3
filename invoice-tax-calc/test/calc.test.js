import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCsv, calculate } from '../src/calc.js';

const csv = 'name,unit_price,quantity,tax_rate\nA,100,3,10\nB,98,1,8\nC,33,1,10\n';
test('groups by rate, rounds once per rate', () => {
  const r = calculate(parseCsv(csv));
  assert.deepEqual(r.groups.map((g) => [g.rate, g.subtotal, g.tax]), [[10, 333, 33], [8, 98, 7]]);
  assert.equal(r.total, 471);
});
test('rounding modes', () => {
  const it = parseCsv('name,unit_price,quantity,tax_rate\nA,15,1,10\n');
  assert.equal(calculate(it, 'floor').tax, 1);
  assert.equal(calculate(it, 'round').tax, 2);
  assert.equal(calculate(it, 'ceil').tax, 2);
  assert.throws(() => calculate(it, 'x'));
});
test('float safety', () => assert.equal(calculate(parseCsv('name,unit_price,quantity,tax_rate\nA,0.1,3,10\n'), 'ceil').groups[0].subtotal, 0.3));
test('invalid input', () => {
  assert.throws(() => parseCsv(''), /empty/);
  assert.throws(() => parseCsv('name,unit_price\nA,1'), /missing column/);
  assert.throws(() => parseCsv('name,unit_price,quantity,tax_rate\nA,x,1,10'), /invalid number/);
  assert.throws(() => parseCsv('name,unit_price,quantity,tax_rate\nA,1,1'), /invalid number/);
  assert.throws(() => parseCsv('name,unit_price,quantity,tax_rate\nA,-1,1,10'), /negative/);
});
test('BOM and CRLF', () => assert.equal(parseCsv('﻿name,unit_price,quantity,tax_rate\r\nA,1,1,10\r\n').length, 1));
test('CLI e2e', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'itc-')), 'i.csv'); writeFileSync(f, csv);
  const out = execFileSync('node', ['src/cli.js', f, '--json']).toString();
  assert.equal(JSON.parse(out).total, 471);
  assert.equal(spawnSync('node', ['src/cli.js', 'nope.csv']).status, 2);
  assert.equal(spawnSync('node', ['src/cli.js']).status, 1);
  assert.equal(spawnSync('node', ['src/cli.js', f, '--round']).status, 2);
});
