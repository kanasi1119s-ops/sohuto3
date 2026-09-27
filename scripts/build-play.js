'use strict';
/**
 * index.html を元に、外部JSファイルをすべてインライン化した単一ファイル版
 * play/index.html を生成する。ダブルクリックで file:// から直接開いて遊べる
 * ようにするため、<script type="module"> ではなく通常の<script>のみを使い、
 * 外部参照を一切残さない。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcHtmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(srcHtmlPath, 'utf8');

const scriptTagPattern = /<script src="([^"]+)" data-inline-src="([^"]+)"><\/script>/g;

html = html.replace(scriptTagPattern, function (whole, srcAttr, inlinePath) {
  const filePath = path.join(root, inlinePath);
  const code = fs.readFileSync(filePath, 'utf8');
  return '<script>\n' + code + '\n</script>';
});

// フッターの相対リンクは単一ファイル版では意味が薄いので注記に置き換える
html = html.replace(
  /ルールブック全文: <a href="docs\/rules\.md">docs\/rules\.md<\/a> ／\s*<a href="play\/index\.html">単一ファイル版\(オフライン用\)<\/a>/,
  'これは単一ファイル版です。詳しいルール全文はリポジトリの docs/rules.md をご覧ください。'
);

html = '<!-- このファイルは scripts/build-play.js による自動生成物です。手で編集しないでください。 -->\n' + html;

const outDir = path.join(root, 'play');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('生成しました: play/index.html');
