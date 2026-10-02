// dist/index.html (JS/CSSをインライン化済み) を play/index.html にコピーする。ダブルクリックで遊べる単一ファイル版。
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('play', { recursive: true });
copyFileSync('dist/index.html', 'play/index.html');
console.log('play/index.html を更新しました');
