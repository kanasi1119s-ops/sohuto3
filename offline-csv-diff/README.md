# オフラインCSV差分 (offline-csv-diff)

Shift_JIS / UTF-8 のCSVを**キー列で突き合わせて**差分(追加・削除・変更)を出す、ブラウザ完結(L1)のツールです。
ファイルは端末の外へ送信されません(CSPで外部通信を遮断、テレメトリなし)。

## 起動
```
npm ci
npm run dev        # 開発サーバ
npm run build      # dist/ を生成(file:// でも開けます。dist/index.html をダブルクリック)
```
## テスト
```
npm run check      # 型チェック + ユニットテスト
npm run e2e        # 要 build。Chromium(既定 /opt/pw-browsers/chromium、CHROMIUM_PATH で変更)を使用
```
## 仕様の要点
- 文字コード: 自動判定(BOM/UTF-8妥当性→不正ならShift_JIS)、手動指定も可
- 区切り: カンマ/タブ/セミコロン自動判定。列順・行順の違いは差分にしない
- 複合キー対応。重複キーは警告(後勝ち)。上限100MB/ファイル
- 差分CSV保存: 先頭が `= + @` 等のセルは `'` を付けて数式実行を防止(Excel対策)。UTF-8 BOM付き
- データの保存場所: なし(ファイルはメモリ上でのみ処理し、保存・送信しません)
- 未実装(MVP外): Excel(.xlsx)対応、セル単位の色分け並列表示、PWA/Service Worker
