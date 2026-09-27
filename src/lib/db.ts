import Dexie, { type Table } from 'dexie'
import type { Client, CompanySettings, InvoiceDoc } from './types'

export class AppDatabase extends Dexie {
  clients!: Table<Client, number>
  invoices!: Table<InvoiceDoc, number>
  settings!: Table<CompanySettings, number>

  constructor(name = 'offline-invoice-maker') {
    super(name)
    this.version(1).stores({
      clients: '++id, name',
      invoices: '++id, kind, docNumber, clientId, issueDate',
      settings: '++id',
    })
  }
}

export const db = new AppDatabase()

export async function getOrCreateSettings(): Promise<CompanySettings> {
  const existing = await db.settings.toCollection().first()
  if (existing) return existing
  const defaults: CompanySettings = {
    companyName: '',
    defaultTaxRatePercent: 10,
  }
  const id = await db.settings.add(defaults)
  return { ...defaults, id }
}

export async function nextDocNumber(kind: InvoiceDoc['kind']): Promise<string> {
  const count = await db.invoices.where('kind').equals(kind).count()
  const prefix = kind === 'invoice' ? 'INV' : 'QT'
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`
}
