# 設計

## 要件（MVP）
発行者設定 / 請求書の作成・保存・一覧・再編集・削除 / 税率別計算 / 源泉徴収 / プレビュー・印刷 / JSON・CSV 入出力 / オフライン動作。

## 構成
- `src/calc.ts` 金額計算（整数演算のみ。数量は千分率に変換）
- `src/store.ts` データモデル・検証(`parseData`)・localStorage 入出力・CSV
- `src/render.ts` 請求書 HTML 生成（全入力を HTML エスケープ）
- `src/main.ts` UI 配線
- `public/sw.js` オフライン用 Service Worker（同一オリジンのみ）

## データモデル
`AppData { version: 1, settings, invoices[] }`。Invoice は `lines[{name, qty, unitPrice(税抜円), taxRate 10|8}]` を持つ。金額は保存せず常に再計算。

## 計算規則
- 明細金額 = 数量×単価を端数処理（設定に従う）
- 税額 = 税率ごとの税抜合計 × 税率 を1回だけ端数処理
- 源泉徴収 = 税抜合計に対し円未満切り捨て
