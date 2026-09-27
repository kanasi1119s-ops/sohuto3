import { beforeEach, describe, expect, it } from 'vitest'
import { db, getOrCreateSettings, nextDocNumber } from './db'

beforeEach(async () => {
  await db.invoices.clear()
  await db.settings.clear()
})

describe('nextDocNumber', () => {
  it('starts at 0001 for a fresh document kind', async () => {
    const num = await nextDocNumber('quote')
    expect(num).toMatch(/^QT-\d{4}-0001$/)
  })

  it('increments independently per document kind', async () => {
    await db.invoices.add({
      kind: 'invoice',
      docNumber: 'INV-2026-0001',
      clientId: null,
      issueDate: '2026-01-01',
      taxRatePercent: 10,
      items: [],
      createdAt: 'now',
      updatedAt: 'now',
    })
    const nextInvoice = await nextDocNumber('invoice')
    const nextQuote = await nextDocNumber('quote')
    expect(nextInvoice).toMatch(/0002$/)
    expect(nextQuote).toMatch(/0001$/)
  })
})

describe('getOrCreateSettings', () => {
  it('creates default settings once and reuses them afterwards', async () => {
    const first = await getOrCreateSettings()
    expect(first.defaultTaxRatePercent).toBe(10)
    const second = await getOrCreateSettings()
    expect(second.id).toBe(first.id)
    expect(await db.settings.count()).toBe(1)
  })
})
