# サードパーティライセンス一覧

`license-checker --production` で生成（本番ビルドに含まれる依存関係のみ、開発用ツールは対象外）。
2026-09-27時点。

| パッケージ | ライセンス |
|---|---|
| react, react-dom, scheduler, loose-envify, js-tokens | MIT |
| dexie | Apache-2.0 |
| jspdf | MIT |
| jspdf の依存: html2canvas, canvg, svg-pathdata, css-line-break, text-segmentation, utrie, rgbcolor, stackblur-canvas, raf, performance-now, base64-arraybuffer, fflate, fast-png, iobuffer, pako | MIT（pakoのみ MIT AND Zlib） |
| dompurify（jspdfの依存） | MPL-2.0 OR Apache-2.0（デュアルライセンス） |
| @babel/runtime, core-js, regenerator-runtime | MIT |

## 販売形態との適合性チェック

- **コピーレフト（GPL/AGPL）ライセンスの依存は検出されなかった。** すべてMIT/Apache-2.0、および
  dompurifyのMPL-2.0（Apache-2.0とのデュアルライセンスのため、いずれかを選択可能）。
- MIT/Apache-2.0/MPL-2.0はいずれも、ソースコードを改変せずライブラリとして利用する限り、
  独自ライセンス（買い切り・非公開ソース）での販売と両立可能。**ただし、配布物（アプリ本体）に
  各ライブラリの著作権表示・ライセンス条文を同梱する必要がある。**
- 対応: 配布ビルドに本ファイル（`docs/THIRD_PARTY_LICENSES.md`）を同梱し、README からリンクすることで
  著作権表示義務を満たす想定。人間による最終確認を推奨。

## npm audit

`npm audit` は依存関係の更新により **0件（High/Critical含め）** まで解消済み
（当初 High 1件・Critical 2件・Moderate 4件を検出、`vite`→8.x、`vitest`→5.x、`jspdf`→4.2.1、
`@vitejs/plugin-react`→6.x へ更新して解消。挙動に影響する変更はなく、更新後も全テスト・ビルドが成功
することを確認済み）。
