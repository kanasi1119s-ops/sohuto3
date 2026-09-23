import { describe, expect, it } from 'vitest'
import { decrypt, deriveKey, encrypt, generateSalt } from '../../src/crypto'

describe('crypto', () => {
  it('round-trips plaintext through encrypt/decrypt', async () => {
    const salt = generateSalt()
    const key = await deriveKey('correct horse battery staple', salt, 1000)
    const payload = await encrypt(key, 'hello vault')
    const out = await decrypt(key, payload)
    expect(out).toBe('hello vault')
  })

  it('produces a different key for a different password (decrypt fails)', async () => {
    const salt = generateSalt()
    const key1 = await deriveKey('password-one', salt, 1000)
    const key2 = await deriveKey('password-two', salt, 1000)
    const payload = await encrypt(key1, 'secret data')
    await expect(decrypt(key2, payload)).rejects.toThrow()
  })

  it('same password + salt derives the same key deterministically', async () => {
    const salt = generateSalt()
    const key1 = await deriveKey('same-password', salt, 1000)
    const key2 = await deriveKey('same-password', salt, 1000)
    const payload = await encrypt(key1, 'deterministic check')
    const out = await decrypt(key2, payload)
    expect(out).toBe('deterministic check')
  })

  it('rejects tampered ciphertext (authentication failure)', async () => {
    const salt = generateSalt()
    const key = await deriveKey('pw', salt, 1000)
    const payload = await encrypt(key, 'authentic data')
    const tampered = { ...payload, ciphertext: payload.ciphertext.slice(0, -4) + 'AAAA' }
    await expect(decrypt(key, tampered)).rejects.toThrow()
  })
})
