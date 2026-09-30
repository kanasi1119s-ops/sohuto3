// file:// （ZIP展開してダブルクリック）でも動くよう、module/crossorigin を外す。
import { readFileSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';

const path = new URL('../dist/index.html', import.meta.url);
const html = readFileSync(path, 'utf-8')
  .replace(/<script type="module" crossorigin /g, '<script defer ')
  .replace(/(<link rel="stylesheet") crossorigin /g, '$1 ');
if (/type="module"|crossorigin/.test(html)) throw new Error('postbuild: module/crossorigin が残っています');
if (!/rel="stylesheet"/.test(html)) throw new Error('postbuild: CSSが別ファイルで出力されていません（CSPでインラインstyleは禁止）');
writeFileSync(path, html);
