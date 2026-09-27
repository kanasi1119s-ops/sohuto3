# コネクロス (ConneCross)

陣取り × カードドローの2人用ブラウザボードゲーム。ブラウザだけで対人戦（同じ画面で交代するホットシート方式）・CPU（AI）対戦の両方が遊べます。

- ルールブック: [`docs/rules.md`](docs/rules.md)
- デバッグ・バランス調整ログ: [`docs/debug-log.md`](docs/debug-log.md)
- 市場・企画調査: [`docs/market-research.md`](docs/market-research.md)
- 法務レビュー: [`docs/legal-review.md`](docs/legal-review.md)
- 公開手順書（人間向け）: [`docs/release-guide.md`](docs/release-guide.md)
- Print & Play 素材: [`docs/print-and-play.md`](docs/print-and-play.md)
- 素材クレジット: [`CREDITS.md`](CREDITS.md)

## 起動方法

```bash
npm install
npm run dev
```

表示されたURL（デフォルトでは http://localhost:5173 ）をブラウザで開くとすぐに遊べます。

## その他のコマンド

```bash
npm run build     # 型チェック + 本番ビルド（dist/に出力）
npm run preview   # ビルド結果をローカルで確認
npm test          # ユニットテスト実行（vitest）
npm run simulate  # AI同士の対戦シミュレーション（既定2,000試合）
```

## 技術スタック

- React + TypeScript + Vite
- ゲームロジックは `src/game/` にUIから独立した純粋関数として実装（テスト・シミュレーションが容易な設計）
- 乱数はシード指定可能な自前PRNG（`src/game/rng.ts`）を使用し、再現性のあるバランス検証を可能にしている

## ディレクトリ構成

```
src/
  game/        ゲームロジック（盤面・デッキ・エンジン・AI）とそのユニットテスト
  components/  UIコンポーネント（盤面表示・ルールモーダル）
  data/        アプリ内表示用のルールテキスト
scripts/
  simulate.ts  AI同士の大量対戦シミュレーションスクリプト
docs/          企画・ルール・テスト・法務・公開・マーケ関連ドキュメント
```
