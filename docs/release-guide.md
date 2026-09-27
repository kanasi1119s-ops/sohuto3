# 公開手順書（人間向け）

このドキュメントは、LinkForge を実際に公開する際に**人間が行うべき作業**をまとめたものです。
Claude（AIオーケストレーター）は、運用上の制約により以下の作業を代行しません。

## 事前チェック（公開前に必ず実施）

- [ ] 人間同士で実際に1〜2回テストプレイし、「面白いかどうか」を確認する（AIシミュレーションだけでは判定できません）
- [ ] `docs/legal-review.md` の「★人間確認事項」（商標調査等）に対応する
- [ ] ゲームタイトル「LinkForge（リンクフォージ）」を実際に使用してよいか最終確認する

## ローカルでの起動・ビルド確認

```bash
npm install
npm run dev       # 開発サーバー起動（http://localhost:5173）
npm run test      # ユニットテスト実行
npm run simulate  # AIシミュレーションによるバランス確認（例: npm run simulate 2000 500）
npm run build     # 本番ビルド（dist/ に静的ファイル一式が生成される）
npm run preview   # ビルド結果をローカルで確認
```

## GitHub Pages で公開する場合

自動デプロイ用のワークフロー `.github/workflows/deploy-pages.yml` を設定済みです（`claude/serene-newton-5i2ypw` ブランチへのpushで自動実行）。
`vite.config.ts` の `base` は既に相対パス（`'./'`）に設定済みなので、サブディレクトリ配信でも追加設定は不要です。

**残っている作業（人間の操作が必要・1回だけ）**:

1. GitHubリポジトリの **Settings → Pages** を開く
2. **Source** を「**GitHub Actions**」に設定して保存する

これだけで、以降は対象ブランチにpushするたびに自動でビルド・公開されます。
公開後のURLは `https://<組織名>.github.io/<リポジトリ名>/` の形式になります（例: `https://kanasi1119s-ops.github.io/sohuto3/`）。
初回は Settings で Pages を有効化した後、Actions タブから `Deploy to GitHub Pages` ワークフローを手動実行（`workflow_dispatch`）すると即座に反映されます。

## itch.io で公開する場合（HTML5ゲームとして）

1. `npm run build` を実行し、`dist/` フォルダの中身一式を **zip圧縮**する（`dist` フォルダ自体ではなく、中の `index.html` などのファイル群をzipのルートに置くこと）
2. itch.io のプロジェクトページ作成画面で「HTML」を選択し、作成したzipをアップロードする
3. 「This file will be played in the browser」にチェックを入れる
4. ビューポートサイズは自由（レスポンシブ対応済みのため、幅可変で問題なし）
5. 価格設定（無料 / 投げ銭 / 有料）は本ドキュメントの範囲外。人間が判断すること

## 公開時に人間が別途行うこと（Claudeは実行しません）

- ストア・販売ページ（itch.io / Steam / BOOTH / ゲームマーケット等）の作成・公開・価格設定
- 決済・課金機能の本番接続
- ドメイン購入・DNS設定
- クラウドファンディング・印刷所への入稿
- 独自ドメイン・SNSでの一般公開、外部への営業・広告出稿
- 有料API・有料素材・クラウドリソースの新規契約

## Print & Play（印刷して遊べる版）について

本MVPはデジタル版のみで、Print & Play用のPDF生成は本サイクルでは未実装です（任意項目のため見送り）。
次サイクル以降で対応する場合は、`docs/rules.md` のコンポーネント定義（7×7盤面・石2色）を元に、
盤面グリッドと駒の型紙をPDF化するスクリプトを追加することを推奨します。
