import { useEffect, useState } from 'react'
import { db, getOrCreateSettings, nextDocNumber } from '../lib/db'
import { buildInvoicePdf } from '../lib/pdf'
import { computeTotals, formatYen } from '../lib/calc'
import type { Client, DocumentKind, InvoiceDoc, LineItem } from '../lib/types'

const EMPTY_ITEM: LineItem = { description: '', quantity: 1, unitPrice: 0 }

interface Props {
  existing: InvoiceDoc | null
  onDone: () => void
}

export function InvoiceEditor({ existing, onDone }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [kind, setKind] = useState<DocumentKind>(existing?.kind ?? 'quote')
  const [docNumber, setDocNumber] = useState(existing?.docNumber ?? '')
  const [clientId, setClientId] = useState<number | null>(existing?.clientId ?? null)
  const [issueDate, setIssueDate] = useState(existing?.issueDate ?? new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '')
  const [taxRatePercent, setTaxRatePercent] = useState(existing?.taxRatePercent ?? 10)
  const [items, setItems] = useState<LineItem[]>(existing?.items ?? [{ ...EMPTY_ITEM }])
  const [notes, setNotes] = useState(existing?.notes ?? '')

  useEffect(() => {
    void db.clients.orderBy('name').toArray().then(setClients)
    if (!existing) {
      void nextDocNumber(kind).then(setDocNumber)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!existing) {
      void nextDocNumber(kind).then(setDocNumber)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function save() {
    const now = new Date().toISOString()
    const record: InvoiceDoc = {
      id: existing?.id,
      kind,
      docNumber,
      clientId,
      issueDate,
      dueDate: dueDate || undefined,
      taxRatePercent,
      items: items.filter((it) => it.description.trim().length > 0),
      notes: notes || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await db.invoices.put(record)
    onDone()
  }

  async function exportPdf() {
    const settings = await getOrCreateSettings()
    const client = clients.find((c) => c.id === clientId)
    const record: InvoiceDoc = {
      id: existing?.id,
      kind,
      docNumber,
      clientId,
      issueDate,
      dueDate: dueDate || undefined,
      taxRatePercent,
      items,
      notes: notes || undefined,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    }
    const pdf = buildInvoicePdf(record, client, settings)
    pdf.save(`${docNumber || 'document'}.pdf`)
  }

  function now() {
    return new Date().toISOString()
  }

  const totals = computeTotals(items, taxRatePercent)

  return (
    <div className="card">
      <h3>{existing ? '編集' : '新規作成'}</h3>
      <div className="form-row">
        <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
          <option value="quote">見積書</option>
          <option value="invoice">請求書</option>
        </select>
        <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="書類番号" />
        <select
          value={clientId ?? ''}
          onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">顧客を選択</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>
          発行日: <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </label>
        <label>
          支払期日: <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label>
          税率(%): <input type="number" style={{ width: 56 }} value={taxRatePercent} onChange={(e) => setTaxRatePercent(Number(e.target.value))} />
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>項目</th>
            <th>数量</th>
            <th>単価</th>
            <th>金額</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>
                <input value={item.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
              </td>
              <td>
                <input
                  type="number"
                  style={{ width: 56 }}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  style={{ width: 80 }}
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                />
              </td>
              <td>{formatYen(Math.round(item.quantity * item.unitPrice))}</td>
              <td>
                <button className="secondary" onClick={() => removeItem(i)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="secondary" onClick={addItem}>
        + 行を追加
      </button>

      <div className="form-row" style={{ marginTop: 16 }}>
        <textarea placeholder="備考（任意）" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ width: '100%' }} />
      </div>

      <p>
        小計: {formatYen(totals.subtotal)} / 税額: {formatYen(totals.taxAmount)} / <strong>合計: {formatYen(totals.total)}</strong>
      </p>

      <div className="form-row">
        <button className="primary" onClick={() => void save()}>
          保存
        </button>
        <button className="secondary" onClick={() => void exportPdf()}>
          PDF出力
        </button>
        <button className="secondary" onClick={onDone}>
          キャンセル
        </button>
      </div>
    </div>
  )
}
