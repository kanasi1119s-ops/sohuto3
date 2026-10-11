# 日次レポート: 2026-10-11

## ⚠ 実行上の問題
- **GitHub 認証**: `gh` の `GH_TOKEN` は無効。GitHub MCP は本セッションでは `kanasi1119s-ops/sohuto3` のみ許可で、新規リポジトリ作成・`orchestrator-log` の参照/作成ができなかった。指示書 1-7 に従い回避策は取らず、**成果物は `sohuto3` の `claude/pensive-goldberg-dh9ir9` ブランチ配下**(`receipt-namer-offline/`、`orchestrator-log/`)に置いた。
- 既存に `-orchestrator-log`(public、名前が先頭ハイフン)があるが、権限外のため未確認。BACKLOG/PROJECTS はこのリポジトリ内 `orchestrator-log/` に作成した。人間が移送要。
- 既存 private/public リポジトリ名は検索で把握(invoice-estimate-tool, mitsumori-seikyusho-tool, accounting-agent, offline-ai-masker- 等)。中身は未確認。

## 本日のプロジェクト
1. 領収書ネーマー (receipt-namer-offline) - 配布形態: L1 - スコア: 22/25 - 状態: **MVP完成(人間確認待ち)**

## マーケットリサーチ結果サマリ
- 採用理由: インボイス制度・電帳法で個人事業主の事務負担が増加(記事複数)。「アップロードしない」を謳うブラウザツールは増えているが、独立した需要データは見つからず(自己申告ベース)。差別化として CSP による通信禁止で「送信しない」を検証可能にした。需要の裏付けは**弱い**ため仮説として扱う。
- スコア: 需要4 / 実装5 / 法的リスク4 / 差別化4 / 運用コスト5 = 22
- 却下案: 請求書/見積書作成(既存リポジトリと重複)、PII マスキング(offline-ai-masker と重複) ※スコアは簡易判断のため詳細採点なし。
- 配布形態: L1 を選択。サーバー処理が不要で、ZIP/静的ホスティング配布が可能なため。

## 実装内容
- 場所: `receipt-namer-offline/`(sohuto3 ブランチ内。private 新規リポジトリは未作成)
- 機能: ファイルのドロップ追加/取引日・取引先・金額・種別・登録番号入力/命名規則プレビューと重複連番/検索簿CSV(BOM, 数式インジェクション対策)/ZIP書き出し・読み込み(自前STORE ZIP)/IndexedDB永続化/PWAキャッシュ
- テスト: ユニット11件 / E2E 4件 / すべて成功
- 未実装: OCR、ZIP圧縮、ライセンスキー認証、アイコン、ESLint(型チェックのみ)

## デバッグ3ラウンド結果
| ラウンド | 検出数(高/中/低) | 修正数 | 持ち越し |
|---|---|---|---|
| Round 1 | 0/1/0 | 1 | 0 |
| Round 2 | 1/0/1 | 2 | 0 |
| Round 3 | 0/0/0 | 0 | 0 |
- 高の1件: 入力欄の change ごとに一覧を再構築し入力が失われるバグ → 修正済み、E2E連続9回成功
- 詳細: receipt-namer-offline/docs/DEBUG_LOG.md

## セキュリティ・法務チェック結果
- 確認済み: npm audit 0件(vite8/vitest5へ更新)、実行時依存0件、GPL系なし、ソース内に秘密情報なし(gitleaks未導入のためgrep確認のみ)、XSS(ファイル名はtextContent)、CSP、ファイル名サニタイズ
- ★要人間確認: 特商法表記(有償販売時必須)、EULA案、プライバシー方針案、LICENSE(現状は全権利留保の仮置き)

## 公開に向けて人間がすべきこと
- [ ] 成果物を新規 private リポジトリへ移すか決定、GitHub 認証(GH_TOKEN)の再発行
- [ ] 需要検証(実ユーザーへのヒアリング)と価格決定
- [ ] 販売／決済アカウント接続、特商法/EULA/プライバシーの最終確認
- [ ] 公開時のホスティング(GitHub Pages有効化など)とドメインの判断
- ※ライセンスキー・コード署名は今回の形態では不要

## マーケ素材
- receipt-namer-offline/docs/marketing/{LP,PRODUCT_DESCRIPTION,SNS}.md

## 翌サイクルへの引き継ぎ
1. GitHub 認証の復旧後、receipt-namer-offline を専用 private リポジトリへ移行し CI を有効化
2. 改善: アイコン/PWA整備、ESLint 追加、ZIP圧縮対応、PDFプレビュー
3. 次候補: 完全ローカルの源泉徴収/支払調書CSV整形(L1)、端末内議事録整形(L3)
