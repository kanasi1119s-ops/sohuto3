# 公開手順書（人間が実施する作業）

このドキュメントは「実際の公開・販売・課金設定」を人間が行うための手順書です。
Claude（開発オーケストレーター）はこれらの作業を代行しません。

## 0. 公開前チェックリスト
- [ ] `node tests/game.test.js` が全件合格することを確認
- [ ] `node scripts/simulate.js 2000` を実行し、`docs/debug-log.md` の
      数値から大きく乖離していないことを確認
- [ ] 実際に人間同士で1〜2回テストプレイし、面白さ・分かりやすさを確認
      （★AIシミュレーションだけでは「面白さ」は判定できません）
- [ ] `docs/rules.md` の「既知の課題」を読み、先手優位が許容範囲か判断
- [ ] ゲームタイトル「カラーフィールド / Color Field」の商標調査
      （簡易検索はできますが、正式な商標調査・出願判断は人間が行ってください）

## 1. ローカルでの起動確認
ビルド不要です。以下のいずれかの方法で起動できます。

- **最速**: `index.html` をブラウザ（Chrome/Edge/Firefox/Safari）に
  ドラッグ＆ドロップ、またはダブルクリックで直接開く。
- **簡易サーバー経由**（`data/config.json` の外部読み込みを試したい場合）:
  ```
  npx http-server . -p 8080
  ```
  その後 `http://localhost:8080` を開く。

## 2. GitHub Pages での公開（無料・静的サイト）
1. このリポジトリの Settings → Pages を開く。
2. Source を「Deploy from a branch」、Branch を公開したいブランチ
   （例: `main`）とルート(`/`)に設定する。
3. 数分後に発行されるURLでアクセスできることを確認する。
4. `.github/workflows/ci.yml` により、push時に自動でユニットテストが
   実行されます（ビルド成果物のデプロイ自体は本手順書に従い手動で
   設定してください）。

## 3. itch.io での公開（HTML5ゲームとして）
1. リポジトリ直下のファイル一式（`index.html`, `style.css`, `main.js`,
   `game.js`, `ai.js`, `rules-text.js`, `data/`）をzip圧縮する。
   ```
   zip -r color-field.zip index.html style.css main.js game.js ai.js rules-text.js data
   ```
2. itch.io で新規プロジェクトを作成し、「This file will be played in
   the browser」を有効にした上でzipをアップロードする。
3. Viewport（推奨: 800×800程度、Fullscreenボタン可）を設定する。
4. 価格・公開範囲（Draft/Public/Restricted）は人間が判断・設定する。

## 4. Print & Play（印刷して遊べる版）について
- 現バージョンはデジタル専用MVPのため、Print & Play用PDFは未作成です。
- 将来対応する場合は、`docs/rules.md` の内容をA4のルールシートに、
  盤面（7×7グリッド）を印刷用画像として書き出すスクリプトを
  `scripts/` に追加することを次サイクルの候補として提案します。

## 5. 価格・決済・法務まわり（★必ず人間が最終判断）
- 無料公開／投げ銭／有料ダウンロードのいずれにするかは `docs/sales/`
  の訴求文を参考に人間が決定してください。
- 有料販売する場合、特定商取引法に基づく表記（事業者情報等）が
  必要です。実際の事業者情報の記入は人間が行ってください。
- 決済・課金の本番接続、ストアページの実際の公開作業、ドメイン取得、
  広告出稿は本プロジェクトの安全装置により自動実行の対象外です。

## 6. CI（GitHub Actions）
`.github/workflows/ci.yml` で、push / PR 時に以下を自動実行します。
- `node tests/game.test.js`（ユニットテスト）
- `node scripts/simulate.js 200`（簡易バランス回帰チェック。数値の
  出力のみで失敗判定はしていません。大きな変化がないか目視確認してください）
