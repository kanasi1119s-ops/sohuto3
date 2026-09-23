import { describe, expect, it } from 'vitest'
import { generatePassword } from '../../src/passwordGen'

describe('generatePassword', () => {
  it('generates a password of the requested length', () => {
    const pw = generatePassword({ length: 24 })
    expect(pw).toHaveLength(24)
  })

  it('only uses digits when other charsets are disabled', () => {
    const pw = generatePassword({ length: 12, upper: false, lower: false, digits: true, symbols: false })
    expect(pw).toMatch(/^[0-9]+$/)
  })

  it('throws when no character set is selected', () => {
    expect(() =>
      generatePassword({ upper: false, lower: false, digits: false, symbols: false }),
    ).toThrow()
  })

  it('throws when length is shorter than the number of required pools', () => {
    expect(() =>
      generatePassword({ length: 1, upper: true, lower: true, digits: true, symbols: true }),
    ).toThrow()
  })

  it('does not repeat the same output across many calls (basic randomness sanity check)', () => {
    const outputs = new Set(Array.from({ length: 50 }, () => generatePassword({ length: 16 })))
    expect(outputs.size).toBe(50)
  })
})
