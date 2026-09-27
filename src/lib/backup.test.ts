import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { exportBackup, importBackup, isBackupPayload } from './backup'

beforeEach(async () => {
  await db.clients.clear()
  await db.invoices.clear()
  await db.settings.clear()
})

describe('isBackupPayload', () => {
  it('accepts a well-formed payload', () => {
    expect(
      isBackupPayload({ formatVersion: 1, exportedAt: 'x', clients: [], invoices: [], settings: null }),
    ).toBe(true)
  })

  it('rejects garbage input', () => {
    expect(isBackupPayload(null)).toBe(false)
    expect(isBackupPayload({})).toBe(false)
    expect(isBackupPayload({ formatVersion: 2, clients: [], invoices: [] })).toBe(false)
  })
})

describe('exportBackup / importBackup round-trip', () => {
  it('restores clients, invoices and settings after a round trip', async () => {
    await db.clients.add({ name: 'Acme', createdAt: 'now' })
    await db.settings.add({ companyName: 'My Co', defaultTaxRatePercent: 10 })
    await db.invoices.add({
      kind: 'quote',
      docNumber: 'QT-2026-0001',
      clientId: 1,
      issueDate: '2026-01-01',
      taxRatePercent: 10,
      items: [{ description: 'Widget', quantity: 2, unitPrice: 500 }],
      createdAt: 'now',
      updatedAt: 'now',
    })

    const backup = await exportBackup()
    expect(backup.clients).toHaveLength(1)
    expect(backup.invoices).toHaveLength(1)

    await db.clients.clear()
    await db.invoices.clear()
    await db.settings.clear()

    await importBackup(backup)

    const clients = await db.clients.toArray()
    const invoices = await db.invoices.toArray()
    const settings = await db.settings.toCollection().first()

    expect(clients).toHaveLength(1)
    expect(clients[0].name).toBe('Acme')
    expect(invoices).toHaveLength(1)
    expect(invoices[0].docNumber).toBe('QT-2026-0001')
    expect(settings?.companyName).toBe('My Co')
  })

  it('replaces existing data rather than merging with it', async () => {
    await db.clients.add({ name: 'Old client', createdAt: 'now' })

    await importBackup({
      formatVersion: 1,
      exportedAt: 'now',
      clients: [{ name: 'New client', createdAt: 'now' }],
      invoices: [],
      settings: null,
    })

    const clients = await db.clients.toArray()
    expect(clients).toHaveLength(1)
    expect(clients[0].name).toBe('New client')
  })
})
