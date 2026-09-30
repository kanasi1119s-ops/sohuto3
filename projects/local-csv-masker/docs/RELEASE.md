# 公開手順書（人間向・本番反映は未実施）
1. `npm ci && npm run check && npm run build` が通ることを確認
2. 配布ZIP: `cd dist && zip -r ../local-csv-masker-0.1.0.zip .`（ZIPを展開して `index.html` を開く場合、Service Workerはhttp(s)でのみ動作。file://ではオフライン動作自体は可能だがPWAインストールは不可）
   - 注意: `index.html` は ES module を使うため file:// では読み込めないブラウザがあります。ZIP配布時は「`npx serve dist` などで起動」または GitHub Pages を案内してください。
3. GitHub Pages（任意・**有効化は人間**）: `.github/workflows/ci.yml` はテストのみ。Pages公開する場合は Settings > Pages で有効化し、dist をデプロイ
4. 販売（任意・人間）: BOOTH/Gumroad 等のアカウント接続、商品ページ作成（docs/marketing/ の文案を使用）、特商法表記・EULA・プライバシー方針の最終確認
5. ライセンスキー方式（買い切りで認証を付ける場合）: Ed25519 鍵ペアを人間が生成し、秘密鍵は安全な場所に保管（リポジトリ禁止）。公開鍵をアプリに埋め込み、オフライン検証を実装（MVP未実装）
6. リポジトリ public 化・独自ドメイン・SNS告知は人間判断
