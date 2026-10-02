# ほしのトリック

予想した回数ぴったりに「トリック」を取る、**3人用のトリックテイキング**ゲーム（ブラウザで遊べます）。

- 人数 3人（1人＋AI2人／3人で1台まわし遊び）／ 時間 約10分 ／ 対象 8歳以上
- 日本語の説明書: [docs/rules.md](docs/rules.md)（ゲーム内の「ルール」ボタンからも読めます）
- 日次レポート: [reports/2026-10-02.md](reports/2026-10-02.md)

## すぐ遊ぶ
- **単一ファイル版**: [`play/index.html`](play/index.html) をダウンロードしてダブルクリック（ネット接続不要）
- **ローカル起動**: `npm install` → `npm run dev`
- **GitHub Pages**: 未公開。公開手順は [docs/release-guide.md](docs/release-guide.md)（人間がPagesを有効化し `ENABLE_PAGES_DEPLOY=true` を設定すると公開されます）

## 開発コマンド
| コマンド | 内容 |
|---|---|
| `npm test` | ユニットテスト＋1,000ゲームの自動対戦（進行不能がないこと） |
| `npm run sim -- 5000` | AI同士の自動対戦でバランス統計を出力 |
| `npm run build` | 型チェック＋ビルド＋ `play/index.html` 更新 |
| `node scripts/e2e.mjs` | ブラウザ(Chromium)で単一ファイル版を最後まで操作する通しテスト（要 `npm run build`） |

## 構成
```
data/config.json   カードのマーク・枚数・得点などのデータ定義
src/game/          ゲームロジック（UIなし。純粋関数のステートマシン、シード付き乱数）
src/ui/            画面（素のTypeScript + DOM）
docs/              rules.md(説明書) / market-research.md / debug-log.md / legal-review.md / release-guide.md / marketing.md
```
技術選定: ゲームが小さく状態遷移が単純なため、React等は使わず Vite + TypeScript(素のDOM) とし、`vite-plugin-singlefile` でJS/CSSを1ファイルに結合。Viteの `base` は `./`（Pagesでもローカルでも同じ成果物）。

ライセンス表記・素材: [CREDITS.md](CREDITS.md)
