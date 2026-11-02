// src/core.mjs を index.html に埋め込み、単一HTMLファイル dist/invoice-calc.html を生成
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const core = readFileSync('src/core.mjs', 'utf8').replace(/^export /gm, '');
const tpl = readFileSync('src/index.html', 'utf8');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/invoice-calc.html', tpl.replace('/*CORE*/', core));
console.log('built dist/invoice-calc.html');
