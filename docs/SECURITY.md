# Security チェックリスト (Phase 5)

## 依存パッケージの脆弱性 (`npm audit`)

- 初回インストール時: **5件**（critical 1 / high 1 / moderate 3）— すべて `vite@5.4.x` / `vitest@2.1.x` 系の開発ツールチェーン（`@vitest/mocker` 経由のパストラバーサル、esbuildの開発サーバー問題）。
- 対応: `vite` を `^6.4.3`、`vitest` を `^3.2.7` に更新し、クリーン再インストールで **2件（moderate）に低減**。全テスト・ビルドが緑であることを確認済み。
- 残存2件: `@vitest/mocker`（`vitest@5`系へのメジャーアップグレードが必要）。
  - **リスク評価**: いずれも**開発時のみ**使用するツール（`vitest run`のバッチテスト実行、`vite build`/`vite preview`）に限定され、本番配布物（`dist/`、ゼロランタイム依存の静的ファイル）には一切含まれない。エクスプロイトには「開発者がVitest UI/開発サーバーを起動した状態で悪意あるサイトを閲覧する」等のローカル環境限定の条件が必要で、本プロジェクトのCI/配布フローでは再現しない。
  - **要対応（次サイクル）**: `vitest@5` への追随を検討し、破壊的変更の影響を確認のうえ更新する。★人間確認不要（技術的にAI側で継続対応可能）だが、時間の都合上本サイクルでは見送り。

## 秘密情報の混入チェック

- 作業ツリー・コミット履歴に対して `sk-`/`AKIA` 等の既知APIキー形式パターン、`BEGIN PRIVATE KEY` 等の秘密鍵マーカー、`password =` 等の直書きパターンを検索。**該当なし**。
- `.env` ファイルは使用していない（本アプリは外部APIを一切呼び出さないため不要）。`.env.example` も同様の理由で作成していない。
- `gitleaks` 等の専用スキャナはこの実行環境に未インストールのため使用せず、パターン検索による手動チェックに留めた。★次サイクルでの導入を推奨。

## OSSライセンス一覧

- 本番ランタイム依存: **0件**（`license-checker --production` の結果、パッケージ自身の `UNLICENSED` のみ）。アプリは純粋なTypeScript/DOM/Web Crypto APIのみで実装され、バンドルされるサードパーティコードは無い。
- 開発時依存（239パッケージ）: MIT 189 / Apache-2.0 11 / BSD-3-Clause 4 / BSD-2-Clause 10 / ISC 21 / Python-2.0 1 / MIT-0 1 / (MIT OR CC0-1.0) 1。
- **GPL/AGPL等のコピーレフトライセンスは検出されず**（買い切り販売モデルとの衝突なし）。
- 詳細は [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) を参照。

## 入力の扱い・XSS対策

- 全てのユーザー入力はDOM APIの `textContent`（`createTextNode`経由）でのみ描画し、`innerHTML` は一切使用していない。E2Eテストでスクリプトインジェクション文字列が実行されずプレーンテキストとして表示されることを検証済み（`tests/e2e/flow.spec.ts`）。
- `Content-Security-Policy` を `index.html` に設定: `default-src 'self'; connect-src 'none'; script-src 'self'` により、たとえ将来XSSが混入しても外部への通信・外部スクリプト読み込みを禁止する多層防御としている。
- パストラバーサル・コマンドインジェクション: 該当なし（ファイルシステムアクセスやサーバーサイド処理が存在しないアーキテクチャ）。
- Electron/Tauri固有の権限設定チェック: 該当なし（L1のためElectron/Tauriを使用していない）。

## 総合判定

MVPとして配布準備を進める上でのブロッカーはなし。残存する2件のmoderate脆弱性は開発ツールチェーン限定でありリスクは低いが、次サイクルでの `vitest@5` 追随を宿題として明記する。
