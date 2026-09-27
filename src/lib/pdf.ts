import { jsPDF } from 'jspdf'
import { computeTotals, formatYen, lineItemAmount } from './calc'
import type { Client, CompanySettings, InvoiceDoc } from './types'

const TITLE: Record<InvoiceDoc['kind'], string> = {
  quote: 'Quotation / 見積書',
  invoice: 'Invoice / 請求書',
}

export function buildInvoicePdf(doc: InvoiceDoc, client: Client | undefined, settings: CompanySettings): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 48
  let y = 56

  pdf.setFontSize(18)
  pdf.text(TITLE[doc.kind], marginX, y)
  y += 28

  pdf.setFontSize(10)
  pdf.text(`No. ${doc.docNumber}`, marginX, y)
  pdf.text(`Issue date: ${doc.issueDate}`, 380, y)
  y += 16
  if (doc.dueDate) {
    pdf.text(`Due date: ${doc.dueDate}`, 380, y)
    y += 16
  }

  y += 12
  pdf.setFontSize(12)
  pdf.text(`To: ${client?.name ?? '(no client)'}`, marginX, y)
  y += 24

  pdf.setFontSize(10)
  pdf.text(`From: ${settings.companyName || '(company name not set)'}`, marginX, y)
  y += 28

  pdf.setFontSize(10)
  pdf.text('Description', marginX, y)
  pdf.text('Qty', 300, y)
  pdf.text('Unit price', 360, y)
  pdf.text('Amount', 460, y)
  y += 8
  pdf.line(marginX, y, 545, y)
  y += 16

  for (const item of doc.items) {
    pdf.text(item.description, marginX, y)
    pdf.text(String(item.quantity), 300, y)
    pdf.text(formatYen(item.unitPrice), 360, y)
    pdf.text(formatYen(lineItemAmount(item)), 460, y)
    y += 18
  }

  y += 8
  pdf.line(marginX, y, 545, y)
  y += 20

  const totals = computeTotals(doc.items, doc.taxRatePercent)
  pdf.text(`Subtotal: ${formatYen(totals.subtotal)}`, 380, y)
  y += 16
  pdf.text(`Tax (${doc.taxRatePercent}%): ${formatYen(totals.taxAmount)}`, 380, y)
  y += 16
  pdf.setFontSize(12)
  pdf.text(`Total: ${formatYen(totals.total)}`, 380, y)

  if (doc.notes) {
    y += 36
    pdf.setFontSize(10)
    pdf.text(doc.notes, marginX, y, { maxWidth: 500 })
  }

  return pdf
}
