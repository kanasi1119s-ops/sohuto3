# DESIGN
## 要件（MVP）
含む: 契約CRUD、停止/再開、月額・年額換算、7日以内の請求、JSON/CSV書き出し、JSON読み込み、オフライン起動。
含まない: ライセンス認証、通知、複数端末同期、通貨換算、CSV読み込み。
## データモデル
`Subscription { id, name, amount(円・整数), cycle(weekly|monthly|quarterly|yearly), nextBilling(YYYY-MM-DD), category, note, active }`
保存キー `offline-sub-ledger:v1`（JSON `{format, version, items}`）。壊れた値は `:corrupt-backup` に退避。
## 構成
`src/core`（純粋関数: calc/io/validate）、`src/storage.ts`、`src/main.ts`（UI。DOM出力は textContent のみ）。
## 計算規則
月額換算 = 年額/12 を四捨五入。月次加算は月末にクランプ（1/31→2/28）し元の日を保持して進める。
