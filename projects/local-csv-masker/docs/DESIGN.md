# 設計

- 配布形態: L1（静的SPA/PWA）。選定理由: サーバー処理が不要・運用コストほぼゼロ・「データが端末から出ない」が価値。
- スタック: TypeScript + Vite（実行時依存ゼロ）。テスト: Vitest / Playwright。

## 構成
| ファイル | 役割 |
|---|---|
| `src/core/csv.ts` | RFC4180 準拠のCSVパース/出力、区切り文字判定 |
| `src/core/detectors.ts` | 検出器（正規表現＋Luhn/マイナンバー検証）、全角→半角の位置保存正規化、重複除去(O(n)) |
| `src/core/mask.ts` | マスク方式、テーブル処理、設定プロファイル |
| `src/core/decode.ts` | UTF-8/Shift_JIS 判別、BOM付き出力 |
| `src/main.ts` | UI（DOM は textContent のみで構築しXSSを避ける） |

## データモデル（設定 JSON v1）
`{ version:1, mode:'redact'|'partial'|'pseudonym', types:PiiType[], words:string[], hasHeader:boolean, columnRules:{[列名]:'auto'|'keep'|'mask'|'drop'} }`

## 画面
入力（ファイル/貼り付け）→ 設定（方式・種類・指定語・列ルール）→ 結果（件数・先頭20行プレビュー・保存）

## 非機能
- 外部通信ゼロ（CSP `connect-src 'none'`、E2Eで外部リクエスト0を検証）
- 10万行CSVを数秒で処理（ユニットテストで上限検証）
