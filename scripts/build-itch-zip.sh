#!/usr/bin/env bash
# itch.io にHTML5ゲームとしてアップロードするためのzipを作成する。
# itch.ioの仕様上、index.html はzip直下に置く必要がある。
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p dist
rm -f dist/nine-territory-itch.zip

zip -r dist/nine-territory-itch.zip \
  index.html \
  src/core.js \
  src/ui.js \
  docs/rules.md \
  -x "*.DS_Store"

echo "作成しました: dist/nine-territory-itch.zip"
echo "itch.io アップロード時は「このファイルをブラウザで実行する」設定と、"
echo "ビューポートの埋め込みサイズ調整を忘れずに行ってください（実際のアップロード作業は人間が行います）。"
