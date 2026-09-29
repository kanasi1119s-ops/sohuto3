# 公開手順（人間が実施。Claude は本番反映しない）

1. リポジトリの public 化可否を判断（LICENSE は暫定の独自許諾案。販売するなら EULA を確定）
2. `npm ci && npm run build` → `dist/` を ZIP 化して配布、または GitHub Pages を有効化（`.github/workflows/pages.yml` を追加。有効化は人間）
3. BOOTH / Gumroad 等の販売アカウント接続・商品登録（`docs/marketing/` の文案を使用）
4. 買い切りライセンスキー方式を採る場合: Ed25519 鍵ペアを人間が生成し、秘密鍵は非公開の場所に保管（リポジトリに置かない）。現MVPにはライセンス認証は未実装
5. 特定商取引法に基づく表記・プライバシーポリシー・EULA の最終確認
