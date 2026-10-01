# 灯台守のよあけ

嵐の夜、サイコロのあかりで4そうの船を港へ。夜明けまでに3そうを届ける **1〜4人用の協力ダイスゲーム**（ブラウザで遊べます）。

- 人数 1〜4人（みんなで相談）／ 時間 約15分 ／ 対象 8歳以上
- 日本語の説明書: [docs/rules.md](docs/rules.md)（ゲーム内の「ルール」ボタンからも読めます）

## 今すぐ遊ぶ

- **いちばん簡単**: [play/index.html](play/index.html) をダウンロードしてダブルクリック（インターネット不要）
- **ローカル起動**: `npm install` → `npm run dev`、表示されたURLをブラウザで開く
- **GitHub Pages**: 未公開。公開手順は [docs/release-guide.md](docs/release-guide.md)

## 開発コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm test` | ゲームロジックのテスト |
| `npm run build` | `dist/` に本番ビルド（`tsc` の型検査込み） |
| `npm run build:single` | 単一ファイル版を `play/index.html` に出力 |
| `npm run simulate` | AI同士の自動対戦（各1,000ゲーム）でバランス検証 |
| `npm run zip` | itch.io 用の `toudaimori-no-yoake-html5.zip` を作成 |

## 構成と実装方針

- スタック: React + TypeScript + Vite。ゲームロジックは UI なしで動く純粋関数（`src/game/engine.ts`）。状態は不変データで、`applyAction(state, action)` が新しい状態を返します。
- 乱数はシード指定可能（`#/play?d=normal&seed=7` で同じ嵐・同じ出目を再現）。
- `src/game/ai.ts` は嵐の結果を先読みする貪欲法AI。画面の「ヒント」とシミュレーションに使っています。
- 画面遷移はハッシュルーティング、Vite の `base` は `./`（Pagesでもローカルでも同じビルドが動く）。
- 関連ドキュメント: [市場調査](docs/market-research.md) / [デバッグログ](docs/debug-log.md) / [シミュレーション結果](docs/simulation-results.md) / [法務チェック](docs/legal-check.md) / [公開手順](docs/release-guide.md) / [マーケ素材](docs/marketing.md) / [日次レポート](docs/daily-report-2026-10-01.md)

素材の出典は [CREDITS.md](CREDITS.md) を参照。
