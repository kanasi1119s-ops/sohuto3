# サブスク台帳 (offline-sub-ledger)

データが端末から出ない、オフライン対応のサブスクリプション管理ツール（配布形態 L1: 静的PWA）。

- 契約の登録・編集・停止・削除、月額/年額換算の合計、7日以内の請求表示
- 保存先: ブラウザの localStorage（この端末・このブラウザ内のみ）。外部通信・テレメトリはありません
- バックアップ: JSON書き出し／読み込み（置き換え）、CSV書き出し
- 初回表示後はオフラインでも起動（Service Worker）

## 使い方
```bash
npm install
npm run dev        # 開発サーバー
npm run build      # dist/ に静的ファイルを生成（ZIPで配布・静的ホスティング可）
npm run check      # 型チェック + ユニットテスト
npm run e2e        # Playwright E2E（要 Chromium。CHROMIUM_PATH でパス指定可）
```

## 注意
- ブラウザのサイトデータを消去すると登録内容も消えます。定期的にJSONで書き出してください。
- 金額は税込・円の整数のみ。通貨換算・為替は未対応です。
- 設計は `docs/DESIGN.md`、公開手順は `docs/RELEASE.md`、品質記録は `docs/DEBUG_LOG.md` を参照。
