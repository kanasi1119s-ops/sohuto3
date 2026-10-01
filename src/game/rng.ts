// シード指定可能な乱数（mulberry32）。状態は number 1つなので不変データとして持ち回せる。
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, s];
}

export function randInt(state: number, n: number): [number, number] {
  const [v, s] = nextRandom(state);
  return [Math.floor(v * n), s];
}

export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const arr = items.slice();
  let s = state;
  for (let i = arr.length - 1; i > 0; i--) {
    let j: number;
    [j, s] = randInt(s, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [arr, s];
}
