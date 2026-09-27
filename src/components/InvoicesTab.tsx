import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { computeTotals, formatYen } from '../lib/calc'
import type { Client, InvoiceDoc } from '../lib/types'
import { InvoiceEditor } from './InvoiceEditor'

export function InvoicesTab() {
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [editing, setEditing] = useState<InvoiceDoc | null | 'new'>(null)

  async function reload() {
    const [inv, cl] = await Promise.all([
      db.invoices.orderBy('issueDate').reverse().toArray(),
      db.clients.toArray(),
    ])
    setInvoices(inv)
    setClients(cl)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function remove(id: number) {
    await db.invoices.delete(id)
    await reload()
  }

  function clientName(id: number | null) {
    return clients.find((c) => c.id === id)?.name ?? '(未設定)'
  }

  if (editing !== null) {
    return (
      <InvoiceEditor
        existing={editing === 'new' ? null : editing}
        onDone={() => {
          setEditing(null)
          void reload()
        }}
      />
    )
  }

  return (
    <div>
      <button className="primary" onClick={() => setEditing('new')} style={{ marginBottom: 16 }}>
        + 新規作成
      </button>
      <table>
        <thead>
          <tr>
            <th>種別</th>
            <th>番号</th>
            <th>顧客</th>
            <th>発行日</th>
            <th>合計</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const totals = computeTotals(inv.items, inv.taxRatePercent)
            return (
              <tr key={inv.id}>
                <td>{inv.kind === 'invoice' ? '請求書' : '見積書'}</td>
                <td>{inv.docNumber}</td>
                <td>{clientName(inv.clientId)}</td>
                <td>{inv.issueDate}</td>
                <td>{formatYen(totals.total)}</td>
                <td>
                  <button className="secondary" onClick={() => setEditing(inv)}>
                    編集
                  </button>{' '}
                  <button className="secondary" onClick={() => void remove(inv.id!)}>
                    削除
                  </button>
                </td>
              </tr>
            )
          })}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={6}>まだ見積書・請求書がありません</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
