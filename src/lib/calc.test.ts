import { describe, expect, it } from 'vitest'
import { computeTotals, formatYen, lineItemAmount } from './calc'

describe('lineItemAmount', () => {
  it('multiplies quantity by unit price and rounds to the nearest yen', () => {
    expect(lineItemAmount({ description: 'x', quantity: 3, unitPrice: 333.33 })).toBe(1000)
  })
})

describe('computeTotals', () => {
  it('sums items and applies tax', () => {
    const totals = computeTotals(
      [
        { description: 'A', quantity: 2, unitPrice: 1000 },
        { description: 'B', quantity: 1, unitPrice: 500 },
      ],
      10,
    )
    expect(totals.subtotal).toBe(2500)
    expect(totals.taxAmount).toBe(250)
    expect(totals.total).toBe(2750)
  })

  it('handles an empty item list', () => {
    const totals = computeTotals([], 10)
    expect(totals).toEqual({ subtotal: 0, taxAmount: 0, total: 0 })
  })

  it('handles a zero tax rate', () => {
    const totals = computeTotals([{ description: 'A', quantity: 1, unitPrice: 1000 }], 0)
    expect(totals.taxAmount).toBe(0)
    expect(totals.total).toBe(1000)
  })

  it('rounds fractional tax amounts to the nearest yen', () => {
    const totals = computeTotals([{ description: 'A', quantity: 1, unitPrice: 999 }], 8)
    expect(totals.taxAmount).toBe(80)
  })
})

describe('formatYen', () => {
  it('adds a yen sign and thousands separators', () => {
    expect(formatYen(1234567)).toBe('¥1,234,567')
  })

  it('formats zero', () => {
    expect(formatYen(0)).toBe('¥0')
  })
})
