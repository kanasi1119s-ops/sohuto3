// シード指定可能な乱数 (mulberry32)。状態は数値1つなので不変データで持ち回れる。
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  const s = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

export function shuffle<T>(arr: T[], rng: number): [T[], number] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const [r, s] = nextRandom(rng);
    rng = s;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return [a, rng];
}
