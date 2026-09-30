# DEBUG_LOG

## Round 1（観点: 機能検証）
| # | 問題 | 再現手順 | 重大度 | 対応 | 修正コミット | 再検証結果 |
|---|---|---|---|---|---|---|
| 1 | `src/core/csv.ts` に BOM 文字が直接混入し lint エラー | `npm run lint` | 低 | エスケープ `﻿` に置換 | 次コミット | lint OK |
| 2 | 型エラー（@types/node 未導入、Uint8Array の BlobPart 型、テスト内の誤引数） | `npm run typecheck` | 低 | 型定義追加・戻り値型修正・テスト修正 | 次コミット | tsc OK |
結果: ユニット23件・E2E 7件・build すべて成功。
