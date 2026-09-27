# ナインテリトリー (Nine Territory)

5×5の盤に1〜9の数字タイルを交互に置き合い、隣り合う弱い数字の相手タイルを奪い合う、2人用の完全情報・戦略のみの数字陣取りゲームです。運の要素（サイコロ・カード引き）は一切ありません。

- プレイ人数: 2人（人間 vs 人間 のホットシート対戦 / 人間 vs AI）
- プレイ時間: 約10〜15分
- 対象年齢: 8歳以上
- ルール全文（日本語）: [docs/rules.md](docs/rules.md)

## 今すぐ遊ぶ

### 方法1: ブラウザですぐ開く（ダブルクリック版）
`play/index.html` をダウンロードしてダブルクリックするだけで、インストールなしで遊べます（外部ファイルへの参照を一切含まない単一ファイルです）。

### 方法2: リポジトリをクローンしてローカルで開く
```bash
git clone <このリポジトリのURL>
cd sohuto3
# ブラウザで index.html を直接開くだけでも動作します
open index.html   # macOS の例。Linuxなら xdg-open index.html、Windowsならダブルクリック
```

簡易サーバーを使いたい場合（GitHub Pages公開時と同じ相対パスの挙動を確認したいとき）:
```bash
npm run start   # http://localhost:8080 で起動 (http-server を使用)
```

### 方法3: GitHub Pages（人間が公開設定を行った場合のみ）
リポジトリの管理者が Settings → Pages の設定と `ENABLE_PAGES_DEPLOY` 変数を有効にすると、
`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。手順は [docs/release-guide.md](docs/release-guide.md) を参照してください。**現時点では未公開です。**

## 開発

このプロジェクトは依存パッケージ（npmライブラリ）を一切使わない、素のHTML/CSS/JavaScriptで作られています（後述の「技術的な補足」参照）。Node.jsはテスト・シミュレーション・ビルドスクリプトの実行にのみ使用します。

```bash
npm test              # ユニットテスト（node:test）を実行
npm run verify-config  # data/game-config.json と実装ロジックの整合性チェック
npm run build          # 整合性チェック + 単一ファイル版 play/index.html を再生成
npm run sim -- 1000 greedy greedy   # AI同士のバランス検証シミュレーション（試行回数, A戦略, B戦略）
```

## ディレクトリ構成

```
index.html            サイト版のエントリーポイント（GitHub Pages / ローカルで使用）
play/index.html        単一ファイル版（自動生成物。手で編集しないこと）
src/core.js             ゲームロジック（UI非依存の純粋関数・AI含む）
src/ui.js               DOM描画とイベント処理
data/game-config.json  盤面サイズや手札などのコンポーネント定義（データ駆動）
docs/rules.md           日本語ルールブック（ゲーム内からも参照可能）
docs/debug-log.md       QA/テストプレイの記録（3ラウンド分）
docs/release-guide.md   人間向け・公開手順書
tests/                  ユニットテスト（node:test）
sim/simulate.js         AI自動対戦によるバランス検証シミュレーション
scripts/                ビルド・検証・配布用スクリプト
CREDITS.md              使用素材とライセンスの記録
.github/workflows/      CI・GitHub Pagesデプロイ設定（公開スイッチは人間が入れる）
```

## 技術的な補足（Tech Lead判断）

このプロジェクトの運用指示書では原則 React/TypeScript/Vite の使用が推奨されていますが、今回は以下の理由から**素のHTML/CSS/JavaScript（ビルドステップなし）**を採用しました。

- `play/index.html` を「ダブルクリックしてすぐ遊べる」状態にするには、`file://` から開いても動く必要があります。ES Modules や多くのバンドラ出力は `file://` からの読み込みでブラウザのCORS制限に引っかかることがあり、通常の `<script>` タグのみで完結する構成の方が確実に動作します。
- ロジック（`src/core.js`）とUI（`src/ui.js`）は分離済みで、UIなしでロジックのみをNode.jsから直接テスト・シミュレーションできます（`tests/`, `sim/` 参照）。
- 乱数はシード指定可能（`mulberry32`）にしてあり、バグ再現やバランス検証の再現性を確保しています。
- 依存パッケージが0件のため、`npm install` すら不要で、サプライチェーンリスクや将来の依存関係の陳腐化を避けられます。
- 今後、対戦人数やUIが複雑化する場合はReact/Viteへの移行を再検討してください（本MVPの範囲では過剰と判断しました）。

## 既知の制約・未実装機能

- オンライン対戦（別端末同士の通信対戦）はMVP対象外です。同一画面での「人間 vs 人間」ホットシート対戦のみ対応しています。
- AIは「ランダム」と「貪欲法（greedy）」の2段階のみです。詳細は [docs/debug-log.md](docs/debug-log.md) のシミュレーション結果を参照してください。特にgreedy同士の自己対戦では先手が有利になる偏りが確認されており、人間同士でのバランス検証が今後必要です。
- 効果音・アニメーションは最小限です。
- Print & Play（印刷して遊ぶ）用の専用PDFは今回未作成です（ルールブックのMarkdownと、5×5マス・1〜9タイルという単純な構成のため、手書きでも代用可能です）。
