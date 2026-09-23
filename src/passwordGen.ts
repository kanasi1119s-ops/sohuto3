// Cryptographically secure password generator using rejection sampling to avoid modulo bias.

export interface PasswordOptions {
  length: number
  upper: boolean
  lower: boolean
  digits: boolean
  symbols: boolean
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
}

const CHARSETS = {
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lower: 'abcdefghijkmnpqrstuvwxyz',
  digits: '23456789',
  symbols: '!@#$%^&*()-_=+[]{}?',
}

function randomIndex(max: number): number {
  const range = 256 - (256 % max)
  const buf = new Uint8Array(1)
  let value: number
  do {
    crypto.getRandomValues(buf)
    value = buf[0]!
  } while (value >= range)
  return value % max
}

export function generatePassword(options: Partial<PasswordOptions> = {}): string {
  const opts = { ...DEFAULT_PASSWORD_OPTIONS, ...options }
  const pools: string[] = []
  if (opts.upper) pools.push(CHARSETS.upper)
  if (opts.lower) pools.push(CHARSETS.lower)
  if (opts.digits) pools.push(CHARSETS.digits)
  if (opts.symbols) pools.push(CHARSETS.symbols)
  if (pools.length === 0) throw new Error('少なくとも1つの文字種を選択してください')
  if (opts.length < pools.length) {
    throw new Error(`文字数は選択した文字種の数 (${pools.length}) 以上にしてください`)
  }

  const all = pools.join('')
  const chars: string[] = []

  // Guarantee at least one character from each selected pool.
  for (const pool of pools) {
    chars.push(pool[randomIndex(pool.length)]!)
  }
  while (chars.length < opts.length) {
    chars.push(all[randomIndex(all.length)]!)
  }

  // Fisher-Yates shuffle so the guaranteed characters aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }

  return chars.join('')
}
