# テンライン（陣取りナンバーズ）

運要素ゼロ、2人用アブストラクト対戦のブラウザゲーム（MVP）。
4x4マスに1〜8の数字タイルを交互に置き合い、縦・横・斜め10本の「ライン」の数字合計を奪い合います。

このプロジェクトは「ボードゲーム開発オーケストレーター」運用フロー（市場調査→企画→ルール設計→実装→テストプレイ→法務レビュー→公開準備→マーケ素材→日次レポート）に沿って、AIオーケストレーターが1サイクルで作成したMVPです。詳細は `reports/` 以下の日次レポートを参照してください。

## すぐに遊ぶ

`index.html` をブラウザで直接ダブルクリックして開くだけで遊べます（ビルド・インストール不要）。

サーバー経由で確認したい場合:

```bash
npx http-server . -p 8080
# http://localhost:8080 を開く
```

## 遊び方

- 詳細ルール: [`docs/rules.md`](docs/rules.md)
- ゲーム内の「ルールを見る」ボタンからも概要を確認できます。
- 対戦相手は「人間（ホットシート対戦）」「AI（ランダム）」「AI（貪欲）」から選べます。

## ディレクトリ構成

```
index.html        画面
style.css         スタイル
game.js           ゲームロジック・AI（ブラウザ/Node両対応、純粋関数）
ui.js             DOM操作（ブラウザ専用）
test/             ユニットテスト
scripts/          バランス検証シミュレーション
docs/             企画・ルール・デバッグログ・法務レビュー・公開手順・マーケ素材
reports/          日次レポート
.github/workflows/ci.yml  CI設定
```

## 開発者向け: テスト・シミュレーション実行

```bash
node test/logic.test.js       # ロジックのユニットテスト
node scripts/simulate.js 3000 # AI対戦シミュレーション（バランス検証）。結果はdocs/simulation-results.mdに出力
```

## ドキュメント一覧

- [市場・トレンド調査](docs/market-research.md)
- [ルールブック](docs/rules.md)
- [デバッグ・テストプレイログ（QA 3ラウンド）](docs/debug-log.md)
- [シミュレーション結果](docs/simulation-results.md)
- [法務レビュー](docs/legal-review.md)
- [公開手順書（人間向け）](docs/release-guide.md)
- [マーケティング素材](docs/marketing.md)
- [使用素材・ライセンス](CREDITS.md)

## 現状のスコープ外（次サイクル以降の検討事項）

- オンライン対戦
- アカウント・ユーザー登録
- 課金・広告
- Print & Play用PDF生成
- 実際の公開（ストア公開・価格設定・ドメイン設定等は人間が実施）
