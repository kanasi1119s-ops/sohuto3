// Minimal IndexedDB wrapper. A single record ("main") holds the entire encrypted vault blob.
// Nothing here ever touches the network - this module has no fetch/XHR/WebSocket calls.

export interface VaultRecord {
  id: 'main'
  version: 1
  salt: string // base64
  iterations: number
  iv: string // base64
  ciphertext: string // base64
  updatedAt: string // ISO timestamp
}

const DB_NAME = 'kinko-vault'
const DB_VERSION = 1
const STORE = 'vault'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getVaultRecord(): Promise<VaultRecord | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get('main')
    req.onsuccess = () => resolve(req.result as VaultRecord | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function saveVaultRecord(record: VaultRecord): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearVaultRecord(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete('main')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
