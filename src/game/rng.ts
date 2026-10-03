// mulberry32: 状態(整数)を持ち回る純粋関数版。シード指定で再現できる。
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0
  const s = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

export function shuffle<T>(arr: T[], seed: number): [T[], number] {
  const a = arr.slice()
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    const [r, ns] = nextRandom(s)
    s = ns
    const j = Math.floor(r * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return [a, s]
}
