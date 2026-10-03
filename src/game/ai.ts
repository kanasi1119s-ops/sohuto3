import { nextRandom } from './rng'
import { CAP, RES, canAfford, legalActions } from './engine'
import type { Action, GameState, Order, Player, Res } from './types'

export type AiLevel = 'random' | 'greedy'

/** 手持ち注文を全部こなすのにあと何個必要か（種類別） */
function needs(p: Player): Record<Res, number> {
  const n: Record<Res, number> = { fish: 0, veg: 0, rice: 0 }
  for (const o of p.hand) for (const r of RES) n[r] += o.cost[r]
  for (const r of RES) n[r] = Math.max(0, Math.min(CAP, n[r]) - p.res[r])
  return n
}

function orderValue(p: Player, o: Order): number {
  // 資源が足りているほど、点が高いほど魅力。足りない量は減点。
  let lack = 0
  for (const r of RES) lack += Math.max(0, o.cost[r] - p.res[r])
  return o.points - lack * 0.9
}

function scoreAction(s: GameState, a: Action): number {
  if (a.type === 'pass') return 0
  const p = s.players[s.current]
  const need = needs(p)
  const gainValue = (r: Res, amt: number) => {
    const useful = Math.min(amt, need[r])
    return useful * 1.4 + (amt - useful) * 0.3
  }
  switch (a.space) {
    case 'fish':
    case 'veg':
    case 'rice':
      return gainValue(a.space, Math.min(3, CAP - p.res[a.space])) + 0.2
    case 'assort':
      return RES.reduce((t, r) => t + gainValue(r, Math.min(1, CAP - p.res[r])), 0) + 0.3
    case 'order': {
      const o = s.market.find((x) => x.id === a.orderId)!
      return orderValue(p, o) * 0.6 - (p.hand.length >= 2 ? 1.5 : 0)
    }
    case 'deliver1':
    case 'deliver2': {
      const o = p.hand.find((x) => x.id === a.orderId)!
      return 4 + o.points * 1.6
    }
    case 'rooster': {
      const base = 1.5
      return base + (a.res ? gainValue(a.res, 1) : 0)
    }
  }
}

/** AIの手を選ぶ。random=ランダム、greedy=簡単な評価値で最大の手（同点はランダム）。 */
export function chooseAction(s: GameState, level: AiLevel, seed: number): [Action, number] {
  const acts = legalActions(s)
  let [r, rng] = nextRandom(seed)
  if (level === 'random') return [acts[Math.floor(r * acts.length)], rng]
  let best: Action[] = []
  let bestScore = -Infinity
  for (const a of acts) {
    // 納品できるのに納品しない手より、納品を強く優先（canAffordを満たす注文がある時）
    const sc = scoreAction(s, a)
    if (sc > bestScore + 1e-9) {
      bestScore = sc
      best = [a]
    } else if (Math.abs(sc - bestScore) <= 1e-9) best.push(a)
  }
  ;[r, rng] = nextRandom(rng)
  return [best[Math.floor(r * best.length)], rng]
}

// 未使用警告を避けつつ、デバッグ用に公開
export { canAfford }
