# invoice-tax-calc
オフライン動作のCLI。CSV明細から、適格請求書の要件（税率ごとに1回の端数処理）で税額・合計を計算します。外部通信なし・依存パッケージなし（Node 18+）。データは端末外に出ません。

## 使い方
```
node src/cli.js items.csv [--round floor|round|ceil] [--json]
```
CSV列: `name,unit_price,quantity,tax_rate`（tax_rateは%、例 10 / 8）。既定の端数処理は切り捨て。
## テスト
`npm run check`
## 保存場所
データ保存なし（入力CSVを読むだけ）。
## 配布（L3）
`npm pack` で tgz 生成。npm publish は人間判断（docs/RELEASE.md）。
