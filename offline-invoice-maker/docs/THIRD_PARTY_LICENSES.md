# サードパーティライセンス

- **配布物（dist/）に含まれる外部ライブラリ: なし**（ランタイム依存ゼロ。`npm audit --omit=dev`: 脆弱性 0）
- 開発時ツール（vite, vitest, typescript, eslint, playwright, jsdom 等）は配布物に含まれない。全依存の `license-checker --summary`: MIT 156 / Apache-2.0 20 / ISC 9 / BSD-2-Clause 8 / BSD-3-Clause 3 / MPL-2.0 2 / MIT-0 1 / Python-2.0 1 / BlueOak-1.0.0 1（GPL/AGPL なし）
- フォント・画像・アイコンは同梱していない（システムフォントのみ）
