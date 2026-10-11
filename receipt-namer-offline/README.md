# 領収書ネーマー (receipt-namer-offline)

PDF・画像の電子取引データ(領収書・請求書など)に、**取引日・取引先・金額**を含むファイル名を付け、検索簿(`index.csv`)と一緒にZIPで書き出すブラウザ完結ツールです。

- 配布形態: **L1 ブラウザ完結(静的SPA)**。サーバー不要。
- 外部通信ゼロ: CSP(`connect-src 'none'`)でブラウザ側が通信を禁止します。テレメトリ・解析は一切ありません。
- データ保存先: ブラウザの IndexedDB のみ。ブラウザのデータ消去で消えるので、ZIP書き出しでバックアップしてください。
- 命名規則: `YYYYMMDD_取引先_金額_種別.拡張子`(重複は `_2`, `_3`…)

> ⚠ 本ツールは電子帳簿保存法の要件を満たすことを保証しません。運用ルールの整備・税理士等への確認はご自身で行ってください。

## 使い方
1. ファイルをドロップ(または選択)
2. 取引日・取引先・金額・種別(・登録番号)を入力 → 保存名がプレビューされます
3. 「ZIPで書き出し」→ `files/`(リネーム済み)、`index.csv`(検索簿・Excel対応)、`manifest.json` を含むZIP
4. 「バックアップZIPを読み込み」で書き出したZIPから復元(往復可能)

## 開発
```bash
npm install
npm run dev        # 開発サーバー
npm run check      # 型チェック + ユニットテスト + ビルド
npm run e2e        # Playwright E2E (Chromium)。CHROMIUM_PATH でブラウザ指定可
npm run build && npm run preview
```
ZIPは自前の無圧縮(STORE)実装で、実行時依存は0件です(`docs/THIRD_PARTY_LICENSES.md`)。

## 制約(MVP)
- OCR・自動読み取りなし(手入力)。ファイル1件あたり50MBまで。ZIPは無圧縮。
- 読み込めるZIPは本アプリが書き出したもののみ。
- 自動アップデートなし。新版は GitHub Releases で確認。
