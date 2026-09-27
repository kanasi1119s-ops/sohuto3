# カラーフィールド (Color Field)

ブラウザで遊べる、2人用の陣地拡張アブストラクトボードゲーム（MVP）です。
自分の色を隣接拡張しながら育て、盤面が埋まったときに一番大きくつながった
「かたまり」が大きい方が勝ちます。

## すぐに遊ぶ（インストール不要）
`index.html` をブラウザ（Chrome / Edge / Firefox / Safari）で直接開くだけで
遊べます。ビルドやサーバー起動は不要です。

- ローカルにクローンした場合: `index.html` をダブルクリック、または
  ブラウザにドラッグ＆ドロップしてください。

サーバー経由で開きたい場合（任意）:
```
npm run serve
```
その後 `http://localhost:8080` を開いてください。

## 遊び方
- ルール全文: [`docs/rules.md`](docs/rules.md)
- ゲーム内の「あそびかた」ボタンからも要点を確認できます。

## 開発者向け情報

### ディレクトリ構成
```
index.html         ゲーム本体（UIのエントリーポイント）
style.css           スタイル
main.js             UIロジック（DOM操作・イベント処理）
game.js             コアゲームロジック（純粋関数・ブラウザ/Node両対応）
ai.js               AI対戦相手（ランダム／貪欲法）とシード付き乱数
rules-text.js        ゲーム内ルールモーダル用テキスト
data/config.json     盤面サイズ等の設定（データ駆動）
tests/game.test.js   ユニットテスト（外部フレームワーク不要）
scripts/simulate.js  AI自己対戦によるバランス検証シミュレーション
docs/                ルールブック・デバッグログ・公開手順書・法務レビュー・訴求文
```

### テストの実行
```
npm test
# または
node tests/game.test.js
```

### バランス検証シミュレーションの実行
```
npm run simulate -- 2000
# または
node scripts/simulate.js 2000
```
先手/後手の勝率、平均ターン数などを出力します。詳細な結果と考察は
[`docs/debug-log.md`](docs/debug-log.md) を参照してください。

### CI
`.github/workflows/ci.yml` により、push / PR ごとにユニットテストと
簡易バランスチェックが自動実行されます。

## 公開について
本リポジトリの成果物はMVP（試作）段階です。実際のストア公開・価格設定・
決済設定・ドメイン取得などは行っていません。公開に向けて人間が行うべき
作業は [`docs/release-guide.md`](docs/release-guide.md) にまとめています。

## ライセンス
コード・ルール・テキストは本プロジェクトのオリジナル制作物です
（MIT License）。使用素材の詳細は [`CREDITS.md`](CREDITS.md) を参照してください。
