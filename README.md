# みなとのあさいち

朝の港の市場で、**ワーカー（働き手）を置いて材料を集め、注文を納品して点数をかせぐ、2人用のワーカープレイスメント**（ブラウザで遊べます）。

- 人数 2人（CPU対戦で1人でも）／ 時間 約10〜15分 ／ 対象 8歳以上
- 日本語の説明書: [docs/rules.md](docs/rules.md)（ゲーム内の「ルール」ボタンからも読めます）

## 今すぐ遊ぶ

- **単一ファイル版**: [`play/index.html`](play/index.html) をダウンロードしてダブルクリック（インターネット不要）
- **ローカル起動**: `npm install` → `npm run dev` → 表示されたURLをブラウザで開く
- **GitHub Pages**: 未公開。公開手順は [docs/release-guide.md](docs/release-guide.md)（人間がPages有効化と `ENABLE_PAGES_DEPLOY=true` の設定を行うと公開されます）

## 開発コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm test` | ユニットテスト（ルール・合法手・得点・全組み合わせの終了保証） |
| `npm run build` | 型チェック＋ビルド（`dist/`。GitHub Pages・itch.io用） |
| `npm run build:single` | 単一ファイル版を `play/index.html` に出力（**ゲームを更新したら再生成してコミット**） |
| `npm run sim 3000` | AI同士の自動対戦（シード固定）でバランス確認 |
| `npm run zip` | itch.io用のHTML5 zipを作成 |
| `node scripts/e2e.mjs <URL> <出力先>` | Playwrightによるブラウザ通しテスト |

## 構成

- `src/game/` ゲームロジック（UIなしでテスト・シミュレーション可能。状態は不変、乱数はシード指定）
- `src/ui/`, `src/App.tsx` 画面（React）
- `data/orders.json` 注文カード20枚（データ駆動）
- `docs/` 説明書・市場調査・デバッグログ・法務チェック・公開手順・販促文・日次レポート
- `.github/workflows/deploy-pages.yml` build は常に実行、deploy は人間が許可するまでスキップ

## 技術メモ

React / TypeScript / Vite。ターン制ロジックは自前の純粋関数ステートマシン（`applyAction(state, action) → newState`）にしました。盤面がなく状態が小さいため、フレームワーク不要と判断しました。Viteの `base` は `./`（Pages・ローカル両対応）、画面遷移はstateのみでURLを使いません。

素材のクレジット: [CREDITS.md](CREDITS.md)
