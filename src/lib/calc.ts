import type { LineItem } from './types'

export interface InvoiceTotals {
  subtotal: number
  taxAmount: number
  total: number
}

/**
 * Rounds to the nearest yen (no fractional currency in this MVP).
 */
function roundYen(value: number): number {
  return Math.round(value)
}

export function lineItemAmount(item: LineItem): number {
  return roundYen(item.quantity * item.unitPrice)
}

export function computeTotals(items: LineItem[], taxRatePercent: number): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => sum + lineItemAmount(item), 0)
  const taxAmount = roundYen(subtotal * (taxRatePercent / 100))
  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  }
}

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`
}
