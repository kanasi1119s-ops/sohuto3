export const DOC_TYPES = ['請求書', '領収書', '見積書', '契約書', '納品書', 'その他'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export interface RecordMeta {
  id: string;
  originalName: string;
  date: string; // YYYY-MM-DD
  vendor: string;
  amount: string; // raw user input
  type: DocType;
  regNo: string; // 適格請求書発行事業者登録番号 (任意)
}
