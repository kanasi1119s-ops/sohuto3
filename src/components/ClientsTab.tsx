import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import type { Client } from '../lib/types'

export function ClientsTab() {
  const [clients, setClients] = useState<Client[]>([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')

  async function reload() {
    setClients(await db.clients.orderBy('name').toArray())
  }

  useEffect(() => {
    void reload()
  }, [])

  async function addClient() {
    const trimmed = name.trim()
    if (!trimmed) return
    await db.clients.add({
      name: trimmed,
      address: address.trim() || undefined,
      email: email.trim() || undefined,
      createdAt: new Date().toISOString(),
    })
    setName('')
    setAddress('')
    setEmail('')
    await reload()
  }

  async function removeClient(id: number) {
    await db.clients.delete(id)
    await reload()
  }

  return (
    <div>
      <div className="card">
        <h3>顧客を追加</h3>
        <div className="form-row">
          <input placeholder="会社名・氏名" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="住所（任意）" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input placeholder="メール（任意）" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="primary" onClick={() => void addClient()}>
            追加
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>名前</th>
            <th>住所</th>
            <th>メール</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.address}</td>
              <td>{c.email}</td>
              <td>
                <button className="secondary" onClick={() => void removeClient(c.id!)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={4}>まだ顧客が登録されていません</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
