# DEBUG_LOG
## Round 1（機能検証）: ユニット8件・build成功。問題0。
## Round 2（異常系・オフライン）: Playwrightでoffline+375px幅、リロード復元、源泉徴収表示を確認。問題0（自動テストで不正税率・小数・負数・巨大値・CSV引用符往復を確認）。
## Round 3（クリーン環境）: 未実施部分あり — リポジトリ未push(GitHub認証不可)のため新規cloneでの検証は不可。ローカルでnpm run check/build/e2eの再実行のみ。
注意: 登録番号チェックデジット判定(checksumHint)は未検証で参考値扱い（UIでは未使用）。
