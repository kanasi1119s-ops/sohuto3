import { decrypt, deriveKey, encrypt, generateSalt, PBKDF2_ITERATIONS, toBase64, fromBase64 } from './crypto'
import { clearVaultRecord, getVaultRecord, saveVaultRecord, type VaultRecord } from './storage'

export interface Entry {
  id: string
  title: string
  username: string
  password: string
  url: string
  notes: string
  updatedAt: string
}

export class WrongPasswordError extends Error {
  constructor() {
    super('マスターパスワードが違います')
    this.name = 'WrongPasswordError'
  }
}

export class VaultExistsError extends Error {
  constructor() {
    super('保管庫は既に作成されています')
    this.name = 'VaultExistsError'
  }
}

export class NoVaultError extends Error {
  constructor() {
    super('保管庫がまだ作成されていません')
    this.name = 'NoVaultError'
  }
}

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportValidationError'
  }
}

/** Holds the derived key and decrypted entries only in memory while unlocked. */
export class Vault {
  private key: CryptoKey | null = null
  private entries: Entry[] = []
  private salt: Uint8Array | null = null
  private iterations = PBKDF2_ITERATIONS

  get isUnlocked(): boolean {
    return this.key !== null
  }

  static async exists(): Promise<boolean> {
    return (await getVaultRecord()) !== undefined
  }

  async create(masterPassword: string): Promise<void> {
    if (await Vault.exists()) throw new VaultExistsError()
    if (masterPassword.length < 8) {
      throw new Error('マスターパスワードは8文字以上にしてください')
    }
    this.salt = generateSalt()
    this.iterations = PBKDF2_ITERATIONS
    this.key = await deriveKey(masterPassword, this.salt, this.iterations)
    this.entries = []
    await this.persist()
  }

  async unlock(masterPassword: string): Promise<void> {
    const record = await getVaultRecord()
    if (!record) throw new NoVaultError()
    const salt = fromBase64(record.salt)
    const key = await deriveKey(masterPassword, salt, record.iterations)
    let plaintext: string
    try {
      plaintext = await decrypt(key, { iv: record.iv, ciphertext: record.ciphertext })
    } catch {
      throw new WrongPasswordError()
    }
    this.salt = salt
    this.iterations = record.iterations
    this.key = key
    this.entries = JSON.parse(plaintext) as Entry[]
  }

  lock(): void {
    this.key = null
    this.entries = []
    this.salt = null
  }

  listEntries(): Entry[] {
    this.assertUnlocked()
    return [...this.entries].sort((a, b) => a.title.localeCompare(b.title, 'ja'))
  }

  async upsertEntry(entry: Omit<Entry, 'updatedAt'>): Promise<void> {
    this.assertUnlocked()
    const now = new Date().toISOString()
    const idx = this.entries.findIndex((e) => e.id === entry.id)
    const full: Entry = { ...entry, updatedAt: now }
    if (idx >= 0) this.entries[idx] = full
    else this.entries.push(full)
    await this.persist()
  }

  async deleteEntry(id: string): Promise<void> {
    this.assertUnlocked()
    this.entries = this.entries.filter((e) => e.id !== id)
    await this.persist()
  }

  /** Returns the raw encrypted vault record as a portable JSON string. Still requires the master password to open. */
  async exportEncrypted(): Promise<string> {
    const record = await getVaultRecord()
    if (!record) throw new NoVaultError()
    return JSON.stringify({ ...record, exportedAt: new Date().toISOString() }, null, 2)
  }

  /** Validates and decrypts an exported blob with the given password before committing it to storage. */
  async importEncrypted(json: string, masterPassword: string): Promise<void> {
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      throw new ImportValidationError('インポートファイルの形式が不正です (JSON解析失敗)')
    }
    if (!isVaultRecordShape(parsed)) {
      throw new ImportValidationError('インポートファイルの形式が不正です (必須フィールド欠落)')
    }
    const salt = fromBase64(parsed.salt)
    const key = await deriveKey(masterPassword, salt, parsed.iterations)
    let plaintext: string
    try {
      plaintext = await decrypt(key, { iv: parsed.iv, ciphertext: parsed.ciphertext })
    } catch {
      throw new WrongPasswordError()
    }
    const entries = JSON.parse(plaintext) as Entry[]
    const record: VaultRecord = {
      id: 'main',
      version: 1,
      salt: parsed.salt,
      iterations: parsed.iterations,
      iv: parsed.iv,
      ciphertext: parsed.ciphertext,
      updatedAt: new Date().toISOString(),
    }
    await saveVaultRecord(record)
    this.salt = salt
    this.iterations = parsed.iterations
    this.key = key
    this.entries = entries
  }

  /** Destroys the vault entirely (used for tests and the explicit "reset" UI action). */
  static async destroy(): Promise<void> {
    await clearVaultRecord()
  }

  private async persist(): Promise<void> {
    if (!this.key || !this.salt) throw new Error('unreachable: vault is locked')
    const payload = await encrypt(this.key, JSON.stringify(this.entries))
    const record: VaultRecord = {
      id: 'main',
      version: 1,
      salt: toBase64(this.salt),
      iterations: this.iterations,
      iv: payload.iv,
      ciphertext: payload.ciphertext,
      updatedAt: new Date().toISOString(),
    }
    await saveVaultRecord(record)
  }

  private assertUnlocked(): void {
    if (!this.key) throw new Error('保管庫はロックされています')
  }
}

function isVaultRecordShape(v: unknown): v is VaultRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.salt === 'string' &&
    typeof r.iterations === 'number' &&
    typeof r.iv === 'string' &&
    typeof r.ciphertext === 'string'
  )
}
