# オフライン請求書メーカー (offline-invoice-maker)

適格請求書（インボイス）形式の請求書を、**ブラウザだけで・オフラインで**作れる静的 Web アプリ（配布形態 L1: 静的SPA/PWA）。

- データはブラウザの localStorage にのみ保存。**外部通信・テレメトリなし**（CSP で同一オリジン以外を遮断）
- 税率ごと（10% / 軽減8%）に1請求書1回の端数処理（切り捨て/四捨五入/切り上げ）
- 源泉徴収税額（100万円以下 10.21%、超過分 20.42%）の任意計算
- JSON バックアップ / 復元、CSV 出力、印刷 / PDF 保存（ブラウザの印刷機能）
- Service Worker により初回読込後はオフラインで起動

## 起動・ビルド

```bash
npm install
npm run dev        # 開発サーバ
npm run build      # dist/ に静的ファイルを生成（ZIPで配布可、任意の静的ホスティングで動作）
npm run preview    # ビルド結果の確認 (http://localhost:4173)
```

> `dist/index.html` を `file://` で直接開く使い方は**非対応**です（ブラウザの ES module 制限）。ZIP配布時は静的ホスティング、またはローカルの簡易サーバー（例: `npx serve dist`）で開いてください。

## テスト

```bash
npm run check                 # 型チェック + ESLint + ユニットテスト
CHROMIUM_PATH=/path/to/chrome npm run test:e2e   # Playwright E2E（CHROMIUM_PATH未指定なら playwright install 済みブラウザ）
```

## データの保存場所

ブラウザの localStorage（キー `offline-invoice-maker:v1`）。ブラウザのデータ消去・プライベートモードで失われるため、**定期的に JSON バックアップを取得**してください。

## 制約 / 未実装

- 請求書以外（見積書・領収書）、複数発行者、PDF直接生成は未対応（印刷ダイアログから PDF 保存）
- 適格請求書の記載事項の充足は利用者責任。税務判断は税理士等に確認してください
- 自動アップデートなし
