# 公開手順（人間向け）

AIは公開を行いません。以下の操作はすべて人間が行います。デプロイ用ワークフロー `.github/workflows/deploy-pages.yml` は、下の1〜2が済むまでデプロイをスキップします（ビルドとテストだけ動きます）。

## GitHub Pages で公開する

1. リポジトリの **Settings → Pages → Build and deployment → Source** を「**GitHub Actions**」にする。
2. **Settings → Secrets and variables → Actions → Variables** に `ENABLE_PAGES_DEPLOY` = `true` を追加する。
3. このブランチの内容を `main` に取り込む（Pull Request をマージ）。または Actions タブで `deploy-pages` を手動実行する（`main` ブランチで実行）。
4. 公開URL `https://<ユーザー名>.github.io/<リポジトリ名>/` で動作確認する。
5. 止めたいときは `ENABLE_PAGES_DEPLOY` を削除し、Settings → Pages で公開を解除する。

## itch.io など

- `npm run zip` で作った `toudaimori-no-yoake-html5.zip`（Actionsの `html5-zip` アーティファクトでも入手可）を HTML5 ゲームとしてアップロードできます。
- ストアページ作成・価格設定・告知はAIは行っていません。文面は [marketing.md](marketing.md) を使えます。

## 公開前チェック

- [ ] 人間同士で1〜2回テストプレイ（面白さ・難易度の確認）
- [ ] タイトルの商標確認（[legal-check.md](legal-check.md)）
- [ ] iPad/iPhone/Android での実機確認
