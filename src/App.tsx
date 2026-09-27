import { useRef, useState } from 'react'
import { ClientsTab } from './components/ClientsTab'
import { InvoicesTab } from './components/InvoicesTab'
import { SettingsTab } from './components/SettingsTab'
import { exportBackup, importBackup, isBackupPayload } from './lib/backup'

type Tab = 'invoices' | 'clients' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    const payload = await exportBackup()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setMessage('バックアップファイルの読み込みに失敗しました（JSON形式ではありません）')
      return
    }
    if (!isBackupPayload(parsed)) {
      setMessage('バックアップファイルの形式が正しくありません')
      return
    }
    const ok = window.confirm('現在のデータをすべて置き換えてインポートします。よろしいですか？')
    if (!ok) return
    await importBackup(parsed)
    setMessage('インポートが完了しました')
    window.location.reload()
  }

  return (
    <div className="app">
      <h1>オフライン見積・請求書メーカー</h1>
      <div className="notice">
        このアプリはすべての処理を端末内（ブラウザ）で完結します。データが外部サーバーへ送信されることはありません。
        定期的に「バックアップ書き出し」でJSONファイルを保存してください。
      </div>

      <div className="tabs">
        <button className={tab === 'invoices' ? 'active' : ''} onClick={() => setTab('invoices')}>
          見積書・請求書
        </button>
        <button className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>
          顧客
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          設定
        </button>
        <span style={{ flex: 1 }} />
        <button className="secondary" onClick={() => void handleExport()}>
          バックアップ書き出し
        </button>
        <button className="secondary" onClick={handleImportClick}>
          バックアップ読み込み
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => void handleFileSelected(e)} />
      </div>

      {message && <div className="notice">{message}</div>}

      {tab === 'invoices' && <InvoicesTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}
