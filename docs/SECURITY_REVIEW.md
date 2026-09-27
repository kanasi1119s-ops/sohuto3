# セキュリティレビュー（Phase 5）

## チェックリスト

- [x] **依存パッケージの脆弱性チェック**: `npm audit` で当初 High 1件・Critical 2件・Moderate 4件
      （vite/esbuild の開発サーバー脆弱性、jspdf経由のdompurify XSS系、vitestのパストラバーサル系）を検出。
      `vite`→8.3.1、`vitest`→5.0.2、`jspdf`→4.2.1、`@vitejs/plugin-react`→6.1.1 へ更新し、
      **0件**まで解消。更新後も `npm run check` / `npm run build` が全て成功することを確認済み。
- [x] **秘密情報の混入チェック**: コミット履歴・作業ツリーを `api key|secret|password|token|BEGIN PRIVATE`
      等のパターンでgrepし、該当なし（本アプリは外部APIを一切使用しないため、そもそもAPIキー等を
      扱う設計になっていない）。`.env` ファイルは存在しない。
- [x] **OSSライセンス一覧**: `docs/THIRD_PARTY_LICENSES.md` に生成・記録。コピーレフトライセンスなし。
- [x] **入力の扱い（XSS等）**: `dangerouslySetInnerHTML` は未使用。すべてのユーザー入力はReactの
      標準テキストレンダリングでエスケープされる。Playwrightスモークテストで `<script>` タグを含む
      入力が実行されないことを確認済み（`docs/DEBUG_LOG.md` Round 2）。
- [x] **パストラバーサル / コマンドインジェクション**: 該当なし（サーバーサイド処理・ファイルシステム
      直接操作・外部コマンド実行を行わない静的SPAのため、攻撃面がそもそも存在しない）。
- [x] **外部通信**: `fetch`/`XMLHttpRequest` の呼び出し箇所なし。Playwrightで全リクエストを
      インターセプトし、`localhost`以外への通信が発生しないことを確認済み（Round 3）。
- [ ] **Tauri/Electronの権限設定**: 該当なし（L1静的SPAのため対象外。将来L2へ移行する場合に再評価）。

## 残課題

- なし（本サイクルで検出した課題はすべて解消済み）。
