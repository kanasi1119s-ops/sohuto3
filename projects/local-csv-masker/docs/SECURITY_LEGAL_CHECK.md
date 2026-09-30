# Security / Legal チェック記録 (2026-09-30)

## Security
- [x] `npm audit`: 脆弱性 0件
- [x] 秘密情報: `gitleaks` は環境に無いため、grep で `key|token|secret|password|BEGIN .* PRIVATE` を全ファイル検査し該当なし（`.env` は .gitignore 済み）。履歴はコミット1件のみ
- [x] OSSライセンス: docs/THIRD_PARTY_LICENSES.md（コピーレフトなし）
- [x] 入力の扱い: DOM は textContent のみ（innerHTML不使用）、CSP で inline script/外部接続を禁止、eval不使用。設定JSONは型検証。ユーザー指定語は正規表現エスケープ済み（ReDoS/注入なし）
- [x] ReDoS: 病的入力（10万文字）テストで線形時間を確認（Round 2 で email 正規表現の二乗時間を修正）
- [ ] 残: Service Worker は同一オリジンのみキャッシュ。ホスティング側で HTTPS/ヘッダ（CSP 等）を設定する場合は人間が実施

## Legal
- [x] 第三者コンテンツ: 画像・フォント・文章の流用なし（アイコンは自作SVG）
- [x] スクレイピング: なし
- [x] 個人情報: アプリは入力データを保存・送信しない。プライバシー方針案は docs/PRIVACY_DRAFT.md（**公開前に人間が最終確認**）
- [x] 特定商取引法: 有料販売する場合は表記が必要（事業者名・所在地・連絡先・価格・返品条件等）。**記入は人間**。BOOTH/Gumroad 利用時はプラットフォームの規約・表記方法も確認
- [x] EULA案・免責: LICENSE（案）。**最終確認は人間**
- [x] OSSライセンスと同梱方法の整合: 同梱義務なし
- [x] LP文言: 収益/効果の保証表現なし。「完全な匿名化を保証しない」旨を明記
- [ ] 要対応(人間): 個人情報保護法上、本ツールの利用者側の取扱い責任は利用者にある旨をLP/EULAで最終確認
