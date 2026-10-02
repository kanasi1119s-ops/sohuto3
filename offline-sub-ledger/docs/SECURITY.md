# SECURITY チェック
- [x] `npm audit`: 脆弱性 0（vitest を最新へ更新して解消。更新前は dev依存に high/critical あり、配布物には含まれない）
- [x] 秘密情報: ソース内に鍵・トークンなし（grep確認）。`.env` は gitignore
- [x] ライセンス: THIRD_PARTY_LICENSES.md 参照
- [x] 入力: DOM出力は textContent のみ（E2EでXSS文字列確認）。インポートは形式・型・件数・サイズを検証。CSVは数式インジェクション対策。パス/コマンド実行は無し
- [x] Service Worker は同一オリジンGETのみキャッシュ
- [ ] 残: CSP メタタグ未設定（静的ホスティング側ヘッダでの設定を推奨）
