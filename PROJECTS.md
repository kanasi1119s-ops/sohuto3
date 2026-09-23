# PROJECTS（本来は orchestrator-log で一元管理する想定。アクセス制限のため暫定的に本リポジトリで記録）

`kanasi1119s-ops` 配下に確認できた既存リポジトリ（2026-09-23時点、`search_repositories` で取得できた範囲。内容へのアクセスは権限がなく不可、名前・説明のみ）:

| リポジトリ | 説明 | 作成日 | 公開設定 |
|---|---|---|---|
| ai-coding-tools-compariso | AIコーディングツール比較サイト | 2026-09-05 | **Public** |
| dev-agent | (説明なし) | 2026-09-21 | **Public** |
| Asahi-shintailabo | J | 2026-09-09 | **Public** |
| - | (説明なし) | 2026-09-01 | **Public** |
| accounting-agent | (説明なし) | 2026-09-21 | **Public** |
| jidousohutosakusei | ソフト作成 | 2026-09-22 | **Public** |
| daily-projects | ソフト開発 | 2026-09-22 | **Public** |
| invoice-estimate-tool | (説明なし) | 2026-09-21 | **Public** |
| sohuto3（本サイクル） | Kinko Vault（ローカル完結型パスワード保管庫）| 2026-09-23 | **Public** ⚠️ |

⚠️ **重要な指摘**: 運用指示書 第1章 大前提3「リポジトリは原則privateで作成する」に反し、上記すべて（本サイクルの `sohuto3` を含む）が **Public** です。`sohuto3` はこのセッション開始時点で既に外部（スケジューラ/プラットフォーム側）によってPublicとして作成されており、AIはリポジトリの作成・可視性設定を行っていません（GitHubアクセスが`sohuto3`単体に限定されているため変更権限があるか自体未確認）。人間による確認を強く推奨します（詳細は REPORT.md 参照）。
