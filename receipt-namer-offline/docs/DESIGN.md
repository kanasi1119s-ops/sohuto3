# 設計
## 要件
電子取引データの検索要件(取引年月日・取引金額・取引先)をファイル名で満たし、検索簿CSVを併せて出力する。ローカル完結・オフライン可。
## 画面
単一画面: ドロップ領域 / 操作ボタン(書き出し・読み込み・全削除) / レコード一覧(入力欄+保存名プレビュー)
## データモデル (IndexedDB `receipt-namer`/`records`)
`{id, originalName, date(YYYY-MM-DD), vendor, amount(入力文字列), type, regNo, blob}`
## モジュール
- `core/naming.ts` 命名・検証(全角数字、禁止文字、Windows予約語、重複採番)
- `core/csv.ts` CSV(BOM+CRLF、数式インジェクション対策)
- `core/zip.ts` 依存なしSTORE ZIP 読み書き(CRC検証)
- `store.ts` IndexedDB / `main.ts` UI(ユーザー入力は textContent のみ)
## セキュリティ設計
CSP: `default-src 'self'; connect-src 'none'; object-src 'none'`。ファイル名はパス区切り等を除去。ZIP取込はメモリ上のみで、ディスクパスとして使わない。
