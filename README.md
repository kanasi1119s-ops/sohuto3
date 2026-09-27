# LinkForge（リンクフォージ）

7×7の盤面で石を5つ連結させたら勝ち。ただし各プレイヤーは3回だけ、相手の"守られていない"石を奪って置き直す「フォージ」を使える——ブラウザで遊べる2人対戦アブストラクトゲームです。

- ローカル対戦（ホットシート）、または簡易AI（ランダム／貪欲法）と対戦できます
- ルール説明はゲーム内から確認できます
- スマホ・タブレットにも対応したレスポンシブUI

## 遊び方（起動方法）

```bash
npm install
npm run dev
```

上記コマンド実行後、表示されるURL（通常は http://localhost:5173 ）をブラウザで開くとすぐに遊べます。

## その他のコマンド

```bash
npm run test      # ユニットテスト（ゲームロジックの検証）
npm run simulate  # AI同士のシミュレーションによるバランス検証（例: npm run simulate 2000 500）
npm run build     # 本番ビルド（dist/ に静的ファイルを生成）
npm run preview   # ビルド結果をローカルで確認
```

## ドキュメント

- [ルールブック](docs/rules.md)
- [企画資料（PdM調査）](docs/pdm-research.md)
- [デバッグ・テストプレイログ](docs/debug-log.md)
- [法務レビュー](docs/legal-review.md)
- [公開手順書](docs/release-guide.md)
- [ストア・SNS向けコピー](docs/sales-copy.md)
- [クレジット表記](CREDITS.md)

## 技術構成

React + TypeScript + Vite。ゲームロジック（`src/game/`）はUIから独立した純粋関数として実装されており、
状態は不変データとして扱われ、乱数はシード指定可能なため再現性のあるバグ調査・シミュレーションが行えます。
