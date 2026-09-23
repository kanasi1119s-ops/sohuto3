# DESIGN: Kinko Vault

## 1. 背景・要件

- ターゲットユーザー: 「パスワード管理はしたいが、クラウド型サブスクの月額課金や情報漏洩リスクは避けたい」個人・フリーランス・小規模チーム。
- 配布形態: L1（ブラウザ完結SPA）。理由は「実装難易度が最も低く運用コストがゼロ」「本質的にサーバー側処理（複数端末同期等）が不要」なため。
- 収益化仮説（検証段階・保証なし）: 買い切りライセンス（将来: 署名付きライセンスキーによるPro版解放）、または寄付/投げ銭モデル。本サイクルでは無料MVPとして実装し、価格戦略は人間の判断に委ねる。

## 2. 画面一覧

1. **セットアップ画面**: 初回のみ。マスターパスワード設定（8文字以上、確認入力必須）。
2. **ロック解除画面**: 2回目以降。マスターパスワード入力。バックアップファイルからのインポートもここから行える。
3. **保管庫画面**: エントリ一覧・検索・新規追加・エクスポート・ロック。
4. **エントリ編集フォーム**: タイトル/ユーザー名/パスワード/URL/メモ、パスワード自動生成ボタン。

## 3. データモデル

### VaultRecord（IndexedDB `kinko-vault` DB, `vault` ストア, key = `"main"`）

```ts
{
  id: 'main',
  version: 1,
  salt: string,       // base64, PBKDF2用ソルト (16 bytes)
  iterations: number,  // PBKDF2反復回数 (既定 300,000)
  iv: string,          // base64, AES-GCM IV (12 bytes)
  ciphertext: string,  // base64, AES-256-GCM暗号文 (Entry[] のJSONを暗号化)
  updatedAt: string,   // ISO8601
}
```

### Entry（復号後、メモリ内にのみ保持）

```ts
{
  id: string,        // crypto.randomUUID()
  title: string,
  username: string,
  password: string,
  url: string,
  notes: string,
  updatedAt: string,
}
```

## 4. 暗号設計

- 鍵導出: PBKDF2-HMAC-SHA256, 300,000 iterations, 16byteランダムソルト（保管庫ごとに1つ）。
- 暗号化: AES-256-GCM, 12byteランダムIV（書き込みごとに再生成）。認証タグ検証によりマスターパスワード誤りと改ざんを検出する（`WrongPasswordError` として利用者に提示）。
- エクスポート: `VaultRecord` をそのままJSON化して書き出す。データは常に暗号化されたままであり、エクスポートファイル自体もマスターパスワードなしでは開けない。
- 鍵はメモリ上の `CryptoKey`（`extractable: false`）としてのみ保持し、ロック時に破棄する。

## 5. 非機能要件

- ネットワーク通信ゼロ（CSPで `connect-src 'none'` を強制、E2Eテストで検証）。
- アイドル5分で自動ロック。
- クリップボードは20秒後に自動クリア（ベストエフォート、`clipboard-read` 権限がない環境では失敗を握りつぶし機能を継続）。
- 入力値はDOM APIの `textContent`/`createTextNode` のみで描画し、`innerHTML` は使用しない（XSS対策）。
