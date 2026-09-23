# Kinko Vault (金庫ヴォルト)

**完全ローカル完結・買い切り型の暗号化パスワード/秘密メモ保管庫。**
ブラウザだけで動く静的Webアプリ（PWA想定）です。サーバーは存在せず、ネットワーク通信は一切行いません。

> ⚠️ **免責事項**: 本ソフトウェアはMVP段階であり、第三者によるセキュリティ監査は受けていません。実際の機密情報（本番の金融口座・企業の機密等）の保管は、監査完了前は自己責任で行ってください。詳細は [docs/legal/DISCLAIMER.md](docs/legal/DISCLAIMER.md) を参照してください。

## 配布形態

**L1: ブラウザ完結SPA (静的サイト / 将来的にPWA化)**。サーバー不要。`dist/` を丸ごとZIP配布するか、静的ホスティング（利用者自身のGitHub Pages等）に置くだけで動作します。

## 主な機能 (MVP)

- マスターパスワードによる保管庫の作成・ロック解除 (AES-256-GCM + PBKDF2-SHA256 300,000回)
- 認証情報エントリのCRUD（タイトル・ユーザー名・パスワード・URL・メモ）
- 暗号学的に安全なパスワード自動生成
- 検索・フィルタ
- **エクスポート/インポート**（暗号化されたJSONファイルとして書き出し・復元。バックアップは利用者自身の責任で管理）
- アイドル5分で自動ロック
- クリップボードコピーは20秒後に自動クリア（ベストエフォート）
- 通信は一切なし（Content-Security-Policy で `connect-src 'none'` を強制）

### 今回のMVPに含まないもの（将来検討 / 要人間確認）

- 複数端末間の同期（本質的にサーバーが必要なため対象外）
- ライセンスキーによる有料版認証（Ed25519オフライン署名検証の設計のみ。秘密鍵の生成・保管は人間が行う）
- ブラウザ拡張機能によるオートフィル
- 自動アップデート機能（GitHub Releasesでの手動確認に留める）
- 第三者セキュリティ監査（公開・課金前に人間が手配することを推奨）

## セットアップ・起動手順

```bash
npm install
npm run dev       # http://localhost:5173 で開発サーバー起動
```

## ビルド

```bash
npm run build      # dist/ に静的ファイルを出力
npm run preview    # ビルド結果を http://localhost:4173 でローカル確認
```

## テスト

```bash
npm run check       # 型チェック + lint + ユニットテスト を一括実行
npm run typecheck
npm run lint
npm run test:unit    # Vitest (crypto / vault / passwordGen)
npm run test:e2e     # Playwright E2E（要: npm run build 済み、またはwebServerが自動起動）
npm run verify:file-protocol  # dist/index.html を file:// (ダブルクリック) で開いた場合の動作確認
```

## データの保存場所

すべてのデータはブラウザの **IndexedDB**（オリジン `kinko-vault` データベース）にのみ保存されます。外部サーバーには一切送信されません。ブラウザのプロファイルを削除するとデータも失われるため、**エクスポート機能で定期的にバックアップ**を取ってください。エクスポートされたJSONファイルもマスターパスワードで暗号化されているため、そのままクラウドストレージ等に置いても内容は保護されます（ただしマスターパスワードの管理は利用者の責任です）。

## オフライン動作の確認

本アプリはネットワークを完全に切断した状態でも全機能が動作します。`tests/e2e/flow.spec.ts` の "page never issues network requests to a remote origin" テストで自動検証しています。

## ライセンス

`LICENSE` を参照してください（販売を前提とした独自EULA草案。最終確定は人間が行ってください）。

## ドキュメント

- [docs/DESIGN.md](docs/DESIGN.md) - 要件・データモデル
- [docs/DEBUG_LOG.md](docs/DEBUG_LOG.md) - QA3ラウンドの記録
- [docs/THIRD_PARTY_LICENSES.md](docs/THIRD_PARTY_LICENSES.md) - 依存パッケージのOSSライセンス一覧
- [docs/RELEASE.md](docs/RELEASE.md) - 公開手順（人間向け）
- [docs/manual/index.html](docs/manual/index.html) - 初心者向け取扱説明書（配布ZIP同梱、file://で直接開いて読める版）
- [docs/REPORT.md](docs/REPORT.md) - 本サイクルの日次レポート
- [docs/legal/](docs/legal/) - 法務チェックリスト・EULA草案・免責事項
- [docs/marketing/](docs/marketing/) - LP・SNS告知文の草稿
