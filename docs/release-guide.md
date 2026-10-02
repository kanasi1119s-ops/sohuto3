# 公開手順（人間向け）

このリポジトリは、人間が下記を行うまで**公開されません**（ワークフローの deploy ジョブはスキップされます）。

## GitHub Pages で公開する
1. リポジトリの Settings → Pages → Build and deployment の Source を「GitHub Actions」にする
2. Settings → Secrets and variables → Actions → Variables に `ENABLE_PAGES_DEPLOY` = `true` を追加する
3. Actions タブから `deploy-pages` を手動実行するか、`main` に push する
4. 公開URL（`https://<ユーザー名>.github.io/<リポジトリ名>/`）で動作確認する
5. 公開を止めたいときは `ENABLE_PAGES_DEPLOY` を削除し、Settings → Pages で公開を解除する

> 注意: `sohuto3` には別ゲームのブランチも並んでいます。Pages に載るのは `main` の内容です。このゲームを公開するには、このブランチを `main` に取り込む（または専用リポジトリへ移す）必要があります。

## itch.io（HTML5）
Actions の成果物 `html5-zip`（`hoshi-trick-html5.zip`）をダウンロードし、itch.io で「HTML」として手動アップロードします。ストアページの作成・価格設定は人間が行ってください。

## 公開前チェック
- 人間2〜3人でのテストプレイ／ゲーム名の商標確認（docs/legal-review.md）
- 価格・決済・特商法表記・プライバシーポリシー（該当する場合）
