export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export const CYCLES: Cycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

export interface Subscription {
  id: string;
  name: string;
  /** 税込金額（円・整数） */
  amount: number;
  cycle: Cycle;
  /** 次回請求日 YYYY-MM-DD */
  nextBilling: string;
  category: string;
  note: string;
  active: boolean;
}

export const MAX_NAME = 100;
export const MAX_AMOUNT = 100_000_000;
export const MAX_ITEMS = 5000;
