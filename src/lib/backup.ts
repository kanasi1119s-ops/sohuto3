import { db } from './db'
import type { BackupPayload } from './types'

export async function exportBackup(): Promise<BackupPayload> {
  const [clients, invoices, settings] = await Promise.all([
    db.clients.toArray(),
    db.invoices.toArray(),
    db.settings.toCollection().first(),
  ])
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    clients,
    invoices,
    settings: settings ?? null,
  }
}

export function isBackupPayload(value: unknown): value is BackupPayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.formatVersion === 1 && Array.isArray(v.clients) && Array.isArray(v.invoices)
}

/**
 * Replaces all local data with the contents of the backup.
 * This is a destructive import by design: the app has no server to merge against,
 * so partial-merge semantics would silently duplicate records instead.
 */
export async function importBackup(payload: BackupPayload): Promise<void> {
  await db.transaction('rw', db.clients, db.invoices, db.settings, async () => {
    await Promise.all([db.clients.clear(), db.invoices.clear(), db.settings.clear()])
    if (payload.clients.length) await db.clients.bulkAdd(payload.clients)
    if (payload.invoices.length) await db.invoices.bulkAdd(payload.invoices)
    if (payload.settings) await db.settings.add(payload.settings)
  })
}
