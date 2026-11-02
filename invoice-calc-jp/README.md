# invoice-calc-jp（配布形態 L1: ブラウザ完結）
税率別の消費税（請求書単位で1回端数処理）と源泉徴収を計算する単一HTMLツール。データは端末内(localStorage)のみ、外部通信なし。CSVで保存/読込可。
- テスト: `npm run check`（ユニット8件）／ビルド: `npm run build` → `dist/invoice-calc.html` ／ E2E: `node test/e2e.cjs`（playwright要）
- 注意: 計算結果は税務上の助言ではありません。登録番号の検証は形式のみです。
