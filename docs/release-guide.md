# 公開手順書（人間向け・DevOpsフェーズ成果物）

本ドキュメントは、MVP「テンライン（陣取りナンバーズ）」を実際に公開する際に**人間が行う作業**の手順書です。
運用ルール上、実際の公開・ストアページ作成・価格設定・ドメイン設定・課金設定はAIオーケストレーターは実行せず、
ここに手順を明記するのみに留めています。

## 前提

- 本プロジェクトはビルド不要の静的サイト（`index.html` / `style.css` / `game.js` / `ui.js`）です。
- Node.js は開発時のテスト・シミュレーション実行にのみ必要で、プレイヤーがゲームを遊ぶ際には不要です。

## ローカルで動作確認する方法（公開前の最終確認・人間のテストプレイ用）

1. 最も簡単な方法: `index.html` をブラウザで直接ダブルクリックして開く（ビルド・サーバー不要）。
2. より本番に近い確認をしたい場合:
   ```bash
   npx http-server . -p 8080
   ```
   を実行し、ブラウザで `http://localhost:8080` を開く。

## GitHub Pages で公開する場合（人間が実行）

1. GitHubリポジトリの Settings → Pages を開く。
2. Source を「Deploy from a branch」、対象ブランチをこのプロジェクトのデフォルトブランチ（例: `main`）、フォルダを `/`（ルート）に設定して保存する。
3. 数分後、`https://<ユーザー名>.github.io/<リポジトリ名>/` でアクセスできるようになる。
4. 独自ドメインを使う場合は、Pages設定の「Custom domain」欄にドメインを入力し、DNS側にCNAME/Aレコードを設定する（本手順は人間が実施。AIはドメイン購入・DNS設定を行わない）。

## itch.io で公開する場合（人間が実行）

1. `index.html`, `style.css`, `game.js`, `ui.js` の4ファイルをzip化する（ルートに `index.html` が直接入るように圧縮すること。フォルダを一段掘った状態でzipすると動作しないので注意）。
   ```bash
   zip -r tenline-mvp.zip index.html style.css game.js ui.js
   ```
2. itch.io で新規プロジェクトを作成し、「Kind of project」を **HTML** に設定する。
3. 作成した zip をアップロードし、「This file will be played in the browser」にチェックを入れる。
4. 埋め込みのビューポートサイズは 400x800 程度（縦長スマホ相当）を推奨。必要に応じて「Mobile friendly」を有効化する。
5. 公開範囲（Draft / Restricted / Public）、価格設定（無料 / 投げ銭 / 有料）は人間が判断して設定する。AIはここまでの準備のみを行い、実際の公開ボタンは押さない。

## Print & Play（印刷して遊べる版）について

- 現状のMVPはブラウザ版のみで、Print & Play用のPDF生成スクリプト・レイアウトは未着手（次サイクル以降の検討事項として `reports/` の引き継ぎ事項に記載）。
- 将来実装する場合は、4x4盤面・A/B用の数字タイル（1〜8各1枚）をA4 1枚に収まるレイアウトのPDFとして生成するスクリプトを追加する想定。

## CI（GitHub Actions）

- `.github/workflows/ci.yml` により、push / pull_request 時に以下が自動実行される:
  - `node test/logic.test.js`（ロジックのユニットテスト）
  - `node scripts/simulate.js 500`（バランス回帰チェック用の簡易シミュレーション）
- 追加の秘密情報（デプロイトークン等）は設定していない。実際に自動デプロイを組む場合は、人間がGitHub Pagesのデプロイ用ワークフロー（`actions/deploy-pages`等）を追加し、必要なリポジトリ設定を行うこと。

## 公開前に人間が必ず確認すること

- [ ] 実際に人間同士で1〜2回テストプレイして面白さ・分かりやすさを確認する
- [ ] タイトル「テンライン」の商標確認（`docs/legal-review.md` 参照）
- [ ] 公開先（GitHub Pages / itch.io 等）の決定
- [ ] 価格・販売形態（無料＋投げ銭 / 有料 / Print & Play）の決定
- [ ] 有料販売する場合は特定商取引法表記の追加
