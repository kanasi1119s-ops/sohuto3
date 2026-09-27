import { useEffect, useState } from 'react'
import { db, getOrCreateSettings } from '../lib/db'
import type { CompanySettings } from '../lib/types'

export function SettingsTab() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void getOrCreateSettings().then(setSettings)
  }, [])

  async function save() {
    if (!settings) return
    await db.settings.put(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  if (!settings) return null

  return (
    <div className="card">
      <h3>事業者情報</h3>
      <p style={{ fontSize: 13, color: '#555' }}>
        ここに入力した情報は端末内にのみ保存され、外部には送信されません。
      </p>
      <div className="form-row">
        <input
          placeholder="会社名・屋号"
          value={settings.companyName}
          onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
        />
      </div>
      <div className="form-row">
        <input
          placeholder="住所（任意）"
          value={settings.address ?? ''}
          onChange={(e) => setSettings({ ...settings, address: e.target.value })}
        />
        <input
          placeholder="メール（任意）"
          value={settings.email ?? ''}
          onChange={(e) => setSettings({ ...settings, email: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label>
          デフォルト税率(%):{' '}
          <input
            type="number"
            style={{ width: 64 }}
            value={settings.defaultTaxRatePercent}
            onChange={(e) => setSettings({ ...settings, defaultTaxRatePercent: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="form-row">
        <textarea
          placeholder="振込先情報など（任意）"
          value={settings.bankInfo ?? ''}
          onChange={(e) => setSettings({ ...settings, bankInfo: e.target.value })}
          rows={3}
          style={{ width: '100%' }}
        />
      </div>
      <button className="primary" onClick={() => void save()}>
        保存
      </button>
      {saved && <span style={{ marginLeft: 8, color: 'green' }}>保存しました</span>}
    </div>
  )
}
