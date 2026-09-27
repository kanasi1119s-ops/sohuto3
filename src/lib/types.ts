export interface Client {
  id?: number
  name: string
  address?: string
  email?: string
  createdAt: string
}

export interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

export type DocumentKind = 'quote' | 'invoice'

export interface InvoiceDoc {
  id?: number
  kind: DocumentKind
  docNumber: string
  clientId: number | null
  issueDate: string
  dueDate?: string
  taxRatePercent: number
  items: LineItem[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CompanySettings {
  id?: number
  companyName: string
  address?: string
  email?: string
  defaultTaxRatePercent: number
  bankInfo?: string
}

export interface BackupPayload {
  formatVersion: 1
  exportedAt: string
  clients: Client[]
  invoices: InvoiceDoc[]
  settings: CompanySettings | null
}
