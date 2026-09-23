import { beforeEach, describe, expect, it } from 'vitest'
import { Vault, WrongPasswordError, VaultExistsError, ImportValidationError, NoVaultError } from '../../src/vault'

beforeEach(async () => {
  await Vault.destroy()
})

describe('Vault', () => {
  it('creates a vault and unlocks it with the correct master password', async () => {
    const v = new Vault()
    await v.create('correct-horse-battery-staple')
    v.lock()
    expect(v.isUnlocked).toBe(false)

    const v2 = new Vault()
    await v2.unlock('correct-horse-battery-staple')
    expect(v2.isUnlocked).toBe(true)
    expect(v2.listEntries()).toEqual([])
  })

  it('rejects unlocking with the wrong master password', async () => {
    const v = new Vault()
    await v.create('correct-horse-battery-staple')
    const v2 = new Vault()
    await expect(v2.unlock('wrong-password')).rejects.toThrow(WrongPasswordError)
  })

  it('rejects unlocking when no vault has been created yet', async () => {
    const v = new Vault()
    await expect(v.unlock('anything')).rejects.toThrow(NoVaultError)
  })

  it('rejects creating a second vault over an existing one', async () => {
    const v = new Vault()
    await v.create('password-one')
    const v2 = new Vault()
    await expect(v2.create('password-two')).rejects.toThrow(VaultExistsError)
  })

  it('rejects a master password shorter than 8 characters', async () => {
    const v = new Vault()
    await expect(v.create('short')).rejects.toThrow()
  })

  it('persists entries across lock/unlock (simulating app reload)', async () => {
    const v = new Vault()
    await v.create('master-password-123')
    await v.upsertEntry({
      id: 'entry-1',
      title: 'Example',
      username: 'alice',
      password: 'hunter2',
      url: 'https://example.com',
      notes: '',
    })
    v.lock()

    const reopened = new Vault()
    await reopened.unlock('master-password-123')
    const entries = reopened.listEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.username).toBe('alice')
  })

  it('updates and deletes entries', async () => {
    const v = new Vault()
    await v.create('master-password-123')
    await v.upsertEntry({ id: 'e1', title: 'A', username: 'u', password: 'p', url: '', notes: '' })
    await v.upsertEntry({ id: 'e1', title: 'A-renamed', username: 'u', password: 'p2', url: '', notes: '' })
    expect(v.listEntries()[0]?.title).toBe('A-renamed')

    await v.deleteEntry('e1')
    expect(v.listEntries()).toHaveLength(0)
  })

  it('round-trips export -> import into a fresh vault', async () => {
    const v = new Vault()
    await v.create('export-import-pw-1')
    await v.upsertEntry({ id: 'e1', title: 'Bank', username: 'bob', password: 'p@ss', url: '', notes: 'note' })
    const exported = await v.exportEncrypted()

    await Vault.destroy()

    const restored = new Vault()
    await restored.importEncrypted(exported, 'export-import-pw-1')
    expect(restored.isUnlocked).toBe(true)
    expect(restored.listEntries()).toHaveLength(1)
    expect(restored.listEntries()[0]?.title).toBe('Bank')
  })

  it('rejects import with the wrong password', async () => {
    const v = new Vault()
    await v.create('right-password-1')
    const exported = await v.exportEncrypted()
    await Vault.destroy()

    const restored = new Vault()
    await expect(restored.importEncrypted(exported, 'wrong-password-1')).rejects.toThrow(WrongPasswordError)
  })

  it('rejects malformed import JSON', async () => {
    const v = new Vault()
    await expect(v.importEncrypted('{not valid json', 'whatever')).rejects.toThrow(ImportValidationError)
    await expect(v.importEncrypted('{"foo":"bar"}', 'whatever')).rejects.toThrow(ImportValidationError)
  })

  it('rejects tampered/corrupted export ciphertext on import', async () => {
    const v = new Vault()
    await v.create('right-password-1')
    const exported = JSON.parse(await v.exportEncrypted())
    exported.ciphertext = exported.ciphertext.slice(0, -4) + 'AAAA'
    await Vault.destroy()

    const restored = new Vault()
    await expect(
      restored.importEncrypted(JSON.stringify(exported), 'right-password-1'),
    ).rejects.toThrow(WrongPasswordError)
  })

  it('import overwrites (does not merge with) an existing vault', async () => {
    const v = new Vault()
    await v.create('shared-master-pw-1')
    await v.upsertEntry({ id: 'old', title: 'Old Entry', username: '', password: '', url: '', notes: '' })
    const backup = await v.exportEncrypted()

    // A second, unrelated vault is now created under the same DB (simulating a fresh browser profile).
    await Vault.destroy()
    const v2 = new Vault()
    await v2.create('other-master-pw-1')
    await v2.upsertEntry({ id: 'new', title: 'New Entry', username: '', password: '', url: '', notes: '' })

    // Importing the backup replaces the current vault entirely.
    await v2.importEncrypted(backup, 'shared-master-pw-1')
    expect(v2.listEntries().map((e) => e.title)).toEqual(['Old Entry'])
  })

  it('handles empty strings and very long field values without corrupting data', async () => {
    const v = new Vault()
    await v.create('master-password-123')
    const longNote = 'x'.repeat(50_000)
    await v.upsertEntry({ id: 'e1', title: 'Edge Case', username: '', password: '', url: '', notes: longNote })
    v.lock()

    const reopened = new Vault()
    await reopened.unlock('master-password-123')
    expect(reopened.listEntries()[0]?.notes).toHaveLength(50_000)
    expect(reopened.listEntries()[0]?.username).toBe('')
  })

  it('handles a large number of entries', async () => {
    const v = new Vault()
    await v.create('master-password-123')
    for (let i = 0; i < 200; i++) {
      await v.upsertEntry({ id: `e${i}`, title: `Site ${i}`, username: `user${i}`, password: 'p', url: '', notes: '' })
    }
    expect(v.listEntries()).toHaveLength(200)
  })
})
