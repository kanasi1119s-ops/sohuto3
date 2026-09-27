# ラインクラフト（Line Craft）

2人で遊べる、10〜15分の短時間アブストラクト・ドラフト＆プレイスメントゲーム。
場に並ぶ3枚のタイルから1枚を選んで盤面4x4マスに置き、縦・横・斜め合計10本のラインで相手より合計値が大きいラインを多く作った方が勝ち。

- ルール詳細: [`docs/rules.md`](docs/rules.md)
- デバッグ・テストプレイ記録: [`docs/debug-log.md`](docs/debug-log.md)
- 法務チェックリスト: [`docs/legal-checklist.md`](docs/legal-checklist.md)
- 公開手順書（人間向け）: [`docs/release-guide.md`](docs/release-guide.md)
- ストア文言・SNS告知文: [`docs/marketing.md`](docs/marketing.md)
- Print & Play（印刷して遊ぶ版）: [`docs/print-and-play.html`](docs/print-and-play.html)（ブラウザで開いて印刷）

## 起動方法

```bash
npm install
npm run dev
```

上記コマンドの後、表示されるURL（通常 http://localhost:5173 ）をブラウザで開けばすぐに遊べます。

その他のコマンド:

```bash
npm run build     # 本番ビルド（dist/ に出力）
npm run preview   # ビルド成果物をローカルで確認
npm run test      # ユニットテスト（vitest）
npm run simulate  # AI同士のシミュレーションでバランスを検証
```

## 遊び方
起動後、画面上部の「モード」から以下を選べます。

- **2人対戦（同じ画面）**: 1台の画面で2人が交互に操作するホットシート対戦
- **AI対戦（標準AI）**: 形勢を評価する貪欲法AIと対戦
- **AI対戦（ランダムAI・簡単）**: ランダムに手を選ぶAIと対戦（練習用）

「ルールを見る」ボタンでいつでもルールを確認できます。

## 技術構成
- React + TypeScript + Vite
- ゲームロジック（`src/game/`）はUIから完全に分離した純粋関数群として実装（`engine.ts`）
- 乱数はシード指定可能（`src/game/rng.ts`）で、バグ再現・シミュレーションが容易
- AI対戦相手はランダム／貪欲法の2種類（`src/game/ai.ts`）
- `scripts/simulate.ts` でAI同士の大量対戦シミュレーションを実行しバランスを検証

## ステータス
本リポジトリはボードゲーム開発オーケストレーターによって作成されたMVP（実際にブラウザで最初から最後まで遊べる状態）です。一般公開・販売・課金・ドメイン取得などは行っておらず、それらは人間の判断・作業に委ねています。詳細は [`docs/release-guide.md`](docs/release-guide.md) を参照してください。
