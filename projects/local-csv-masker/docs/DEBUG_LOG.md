# DEBUG_LOG

## Round 1（観点: 機能検証）
| # | 問題 | 再現手順 | 重大度 | 対応 | 修正コミット | 再検証結果 |
|---|---|---|---|---|---|---|
| 1 | `src/core/csv.ts` に BOM 文字が直接混入し lint エラー | `npm run lint` | 低 | エスケープ `﻿` に置換 | 次コミット | lint OK |
| 2 | 型エラー（@types/node 未導入、Uint8Array の BlobPart 型、テスト内の誤引数） | `npm run typecheck` | 低 | 型定義追加・戻り値型修正・テスト修正 | 次コミット | tsc OK |
結果: ユニット23件・E2E 7件・build すべて成功。

## Round 2（観点: 異常系・境界値）
| # | 問題 | 再現手順 | 重大度 | 対応 | 修正コミット | 再検証結果 |
|---|---|---|---|---|---|---|
| 1 | メール検出の正規表現が `0-0-0-…`(10万文字)で二乗時間（約12秒・UIフリーズ） | tests/unit/edge.test.ts「pathological」 | 高 | 先読み否定で開始位置を限定 | fix(local-csv-masker): 全角対応・ReDoS解消… | 5秒以内で通過 |
| 2 | 重複除去が O(n²)（大量マッチで遅延） | 同上 | 高 | 占有マップ(Uint8Array)で O(n) | 同上 | 通過 |
| 3 | 全角の電話/メール/郵便番号を検出できない | unit「full-width」 | 中 | 位置保存の全角→半角正規化を検出前に適用 | 同上 | 通過 |
| 4 | 部分マスクで全角数字が伏せられない | unit「partial…full-width」 | 中 | 3と同時解消（正規化値でマスク） | 同上 | 通過 |
| 5 | 仮名化がメールの大小文字違いを別人扱い | unit「case-insensitive」 | 低 | email は小文字キーで照合 | 同上 | 通過 |
| 6 | 自由テキスト保存時のファイル名が masked.csv | 手動確認 | 低 | masked.txt に分岐 | 同上 | 目視確認 |
追加確認（問題なし）: 10万行CSV処理、閉じ引用符なし、空入力、不正な設定JSON、オフライン動作、スマホ幅(375px)、保存→再読込復元、設定エクスポート→インポート往復。

## Round 3（観点: クリーン環境・回帰）
| # | 問題 | 再現手順 | 重大度 | 対応 | 修正コミット | 再検証結果 |
|---|---|---|---|---|---|---|
| 1 | 新規clone: README手順（npm ci → check → build → test:e2e）は全件成功 | 新規clone | - | - | - | OK |
| 2 | ZIP展開(file://)で ES module/crossorigin が CORS ブロックされアプリが起動しない | dist/index.html を file:// で開く | 高 | iife出力 + postbuild で module/crossorigin を除去、E2E追加 | 最終コミット | file:// E2E 通過 |
| 3 | iife化でCSSがJSに埋め込まれ、CSP(style-src 'self')でスタイルが無効化 | file:// のコンソールエラー | 中 | cssCodeSplit:false で別ファイル出力、postbuild で検証、E2Eでconsole error 0を検証 | 最終コミット | console error 0 |
結果: 重大度「高」残0。最終の新規cloneでの回帰結果は docs/REPORT.md を参照。
