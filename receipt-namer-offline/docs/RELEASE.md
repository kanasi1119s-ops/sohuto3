# 公開手順書(人間が実行。Claude は本番反映をしていません)
1. `npm ci && npm run check && npm run e2e` が成功することを確認
2. `npm run build` → `dist/` を ZIP 化して配布(`file://` 直開きではService Worker/IndexedDBの挙動が異なるため、ローカルサーバ or HTTPS 配信を推奨)
3. GitHub Pages で公開する場合(**有効化は人間**): Settings → Pages → `dist` をデプロイするワークフローを追加
4. 販売(BOOTH/Gumroad 等)する場合: アカウント接続・商品登録・特商法表記の記入は人間が行う。ライセンスキー方式は MVP 未実装(買い切り=ZIP配布を想定)
5. リポジトリの public 化・独自ドメインは人間判断
6. 公開前に docs/legal/ の各ドラフトを最終確認
