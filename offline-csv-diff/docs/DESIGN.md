# 設計
- 配布形態: L1(静的SPA)。理由: サーバー不要・社外秘データを扱う用途・運用コストゼロ。
- 構成: `src/csv.ts`(パース/出力) `src/encoding.ts`(文字コード) `src/diff.ts`(差分) `src/main.ts`(UI)
- データモデル: `Row=string[]` → 見出しで `Record<string,string>` 化 → キー連結(\u0001区切り)で Map 照合 O(n)
- 画面: ファイル選択(旧/新)→キー列選択→比較→結果3表→CSV保存
- 出力はすべて textContent で描画(XSS対策)。CSP: connect-src 'none'
- ビルド: IIFE出力+postbuildで `type=module` を除去し file:// で動作させる
