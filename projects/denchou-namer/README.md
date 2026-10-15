# 電帳ネーマー (denchou-namer)

受け取った請求書・領収書などのファイルに **「取引年月日_取引先_金額[_種別].拡張子」** の名前を付け、**索引台帳CSV** と一緒に **ZIP** にまとめる、ブラウザ完結(L1)のツールです。

- 配布形態: **L1 ブラウザ完結の静的SPA/PWA**(サーバー不要・外部通信ゼロ・オフライン動作)
- ファイルは端末の外に送信されません(CSPで `connect-src 'self'` に制限、E2Eテストで外部通信ゼロを検証)
- 保存するデータは「取引先の表記ゆれ辞書」のみ(ブラウザの localStorage)。CSVでエクスポート/インポート可能

> 本ツールは電子帳簿保存法の要件充足を保証しません。運用は税理士・税務署等にご確認ください。

## 使い方
1. ファイルをドロップ(または選択)。ファイル名から日付・金額・取引先を推測して下書きします
2. 各行の取引年月日・取引先・金額を確認/修正(令和8年10月15日、R8.10.15、2026/10/15、¥12,345 などの表記に対応)
3. 全行が有効になったら「ZIPで保存」。リネーム済みファイルと `索引台帳.csv` が入ります

命名規則の詳細・制約は [docs/DESIGN.md](docs/DESIGN.md)。

## 開発
要件: Node.js 20 以上
```bash
npm ci
npm run dev        # 開発サーバー
npm run check      # 型チェック + lint + ユニットテスト
npm run build      # dist/ に静的ファイルを生成
npm run test:e2e   # Playwright E2E(初回は `npx playwright install chromium` が必要)
```
Chromium を別途用意している場合は `CHROMIUM_PATH=/path/to/chrome npm run test:e2e`。

`dist/` を任意の静的ホスティングに置くか、ZIPに固めて配布し、展開した `index.html` をブラウザで直接開いても動作します(E2Eで検証済み)。ただしオフライン用の Service Worker は http(s) 配信時のみ有効です(`file://` では不要・無効)。

## データの保存場所
- 取引先辞書: ブラウザの localStorage(キー `dict`)。端末外には出ません
- それ以外(読み込んだファイル、入力内容)はメモリ上のみ。タブを閉じると消えます

## ライセンス
[LICENSE](LICENSE)(利用許諾の案。人間の最終確認前)。第三者ライセンスは [docs/THIRD_PARTY_LICENSES.md](docs/THIRD_PARTY_LICENSES.md)。
