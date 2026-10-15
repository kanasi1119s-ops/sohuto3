# 公開手順書(人間が実行)
このプロジェクトは静的サイトです。以下はすべて人間の判断・操作が必要です(自動実行していません)。
1. 内容確認後、リポジトリを独立させる/public化するか判断(現在は private)
2. `npm ci && npm run check && npm run build` → `dist/` を ZIP 化(`cd dist && zip -r ../denchou-namer-0.1.0.zip .`)して配布物にする
3. 販売: BOOTH/Gumroad 等でアカウント接続・商品登録(`docs/marketing/` の文面を使用)。特商法表記は `docs/legal/TOKUSHOHO_NOTE.md`
4. (任意)GitHub Pages: `.github/workflows/pages.yml` を確認し、Settings → Pages で有効化(手動実行のみの設定)
5. ライセンスキー方式(買い切り販売で必要なら): Ed25519 署名キーを人間が生成・保管。**秘密鍵はリポジトリに置かない**。MVPは未実装(ZIP配布を想定)
6. 公開前の最終確認: LICENSE(EULA案)、PRIVACY、特商法、LP文言の誇大表現チェック
