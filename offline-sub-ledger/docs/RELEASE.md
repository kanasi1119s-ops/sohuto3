# RELEASE（人間が実行する手順）
1. `npm ci && npm run check && npm run e2e && npm run build`
2. 配布方法を選ぶ（いずれも**人間の判断**）
   - GitHub Pages: リポジトリ設定で Pages を有効化し `dist/` を公開（`.github/workflows/ci.yml` はビルド検証のみ。公開ワークフローは意図的に未作成）
   - ZIP販売: `dist/` をZIP化して BOOTH/Gumroad 等に登録（アカウント接続・価格設定・公開は人間）
3. 公開前に `docs/LEGAL.md` の要確認項目（特商法表記・EULA・プライバシー方針）を確定
4. 買い切りでライセンスキー認証を付ける場合は次サイクルで設計（Ed25519 署名キー。秘密鍵は人間が生成・保管しリポジトリに置かない）
