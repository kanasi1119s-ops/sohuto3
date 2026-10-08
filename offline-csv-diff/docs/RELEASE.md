# 公開手順(人間が実施)
1. 判断: リポジトリのpublic化可否、販売有無
2. ZIP配布: `npm ci && npm run build` → `dist/` をZIP化(`dist/index.html` をダブルクリックで動作)
3. 販売: BOOTH/Gumroad等のアカウント接続・商品登録は人間(docs/marketing/ の文面を利用)
4. 特商法表記(販売者名・住所・連絡先等)・EULA・プライバシー方針を最終確認
5. (任意)GitHub Pages: Settings→Pages で有効化(ワークフロー未作成。必要なら追加)
注意: 買い切りライセンスキー認証は未実装(MVP外)。実装時は Ed25519 署名キー方式、秘密鍵は人間が生成・保管。
