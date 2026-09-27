/**
 * Deterministic, seedable PRNG (mulberry32). Lets us reproduce and simulate games.
 * We store the numeric state on GameState so the whole engine stays a pure state machine.
 */
export function nextRandom(state: number): { value: number; nextState: number } {
  let t = (state + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, nextState: (state + 0x6d2b79f5) | 0 }
}

export function randomInt(state: number, maxExclusive: number): { value: number; nextState: number } {
  const { value, nextState } = nextRandom(state)
  return { value: Math.floor(value * maxExclusive), nextState }
}

export function shuffle<T>(items: T[], seed: number): { shuffled: T[]; nextSeed: number } {
  const arr = items.slice()
  let state = seed
  for (let i = arr.length - 1; i > 0; i--) {
    const r = randomInt(state, i + 1)
    state = r.nextState
    const j = r.value
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return { shuffled: arr, nextSeed: state }
}
