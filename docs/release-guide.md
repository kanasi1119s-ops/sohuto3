# 公開手順（人間向け）

このリポジトリは、**push するとテストとビルドだけが自動で走り、公開（デプロイ）は人間が許可するまで行われません。**

## GitHub Pagesで公開する
1. リポジトリの Settings → Pages → Build and deployment の Source を「**GitHub Actions**」にする。
2. Settings → Secrets and variables → Actions → **Variables** に `ENABLE_PAGES_DEPLOY` = `true` を追加する。
3. Actions タブから `deploy-pages` を手動実行する（または `main` に push する）。
4. 公開URL（`https://<ユーザー名>.github.io/<リポジトリ名>/`）で動作確認する。
5. 公開を止めたいときは `ENABLE_PAGES_DEPLOY` を削除し、Settings → Pages で公開を解除する。

> 注意: deploy ジョブは `main` ブランチへの push／手動実行でのみ動きます。開発ブランチ（`claude/*`）や Pull Request では build のみ実行されます。

## itch.io など
- `npm run zip` で `minato-asaichi-html5.zip`（HTML5ゲーム用）ができます。CIの成果物（html5-zip）からも入手できます。
- ストアページの作成・価格設定・公開は人間が行ってください。文面は `docs/store-copy.md` に草稿があります。

## 公開前チェック
- 人間同士で1〜2回テストプレイ → 面白さを確認
- ゲームタイトルの商標確認（docs/legal-review.md）
- 有料にする場合は特定商取引法の表記、決済設定
