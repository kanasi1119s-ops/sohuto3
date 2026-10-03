import ordersData from '../../data/orders.json'
import { shuffle } from './rng'
import type {
  Action,
  GameState,
  Order,
  Player,
  PlayerIndex,
  Res,
  ScoreBreakdown,
  SpaceId,
} from './types'

export const RES: Res[] = ['fish', 'veg', 'rice']
export const RES_LABEL: Record<Res, string> = { fish: '魚', veg: '野菜', rice: '米' }
export const RES_ICON: Record<Res, string> = { fish: '🐟', veg: '🥬', rice: '🍚' }
export const CAP = 6 // 資源は各種類6個まで
export const HAND_LIMIT = 3 // 手元の注文カードは3枚まで
export const ROUNDS = 6
export const TURNS_PER_ROUND = 6 // 各自3人のワーカー
export const MARKET_SIZE = 3
export const FIRST_PLAYER_BONUS: Res[] = [] // シミュレーションで補正不要と判断（先手46.8%・後手52.0%）。1資源でも先手60%に傾くため0のまま // 先手の初期資源（各1）

export const ORDERS = ordersData as Order[]

export const SPACES: { id: SpaceId; name: string; desc: string; icon: string }[] = [
  { id: 'fish', name: '漁港', desc: '魚を3つもらう', icon: '⚓' },
  { id: 'veg', name: '畑', desc: '野菜を3つもらう', icon: '🌾' },
  { id: 'rice', name: '米蔵', desc: '米を3つもらう', icon: '🏚️' },
  { id: 'assort', name: '朝市の屋台', desc: '魚・野菜・米を1つずつもらう', icon: '🏮' },
  { id: 'order', name: '注文所', desc: '場の注文カードを1枚もらう', icon: '📜' },
  { id: 'deliver1', name: '納品所A', desc: '注文を1枚納品して得点', icon: '📦' },
  { id: 'deliver2', name: '納品所B', desc: '注文を1枚納品して得点', icon: '📦' },
  { id: 'rooster', name: '一番どり', desc: '好きな資源1つ＋次のラウンドの先手', icon: '🐓' },
]
export const SPACE_IDS = SPACES.map((s) => s.id)

export const other = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0)

export function canAfford(p: Player, o: Order): boolean {
  return RES.every((r) => p.res[r] >= o.cost[r])
}

/** 資源を上限(CAP)つきで加える。実際に増えた量の合計を返す。 */
function gain(p: Player, r: Res, n: number): number {
  const before = p.res[r]
  p.res[r] = Math.min(CAP, before + n)
  return p.res[r] - before
}

export function gainAmount(p: Player, space: SpaceId): number {
  const room = (r: Res) => CAP - p.res[r]
  switch (space) {
    case 'fish':
      return Math.min(3, room('fish'))
    case 'veg':
      return Math.min(3, room('veg'))
    case 'rice':
      return Math.min(3, room('rice'))
    case 'assort':
      return RES.reduce((a, r) => a + Math.min(1, room(r)), 0)
    default:
      return 0
  }
}

export function newGame(seed: number): GameState {
  const [deck, rng] = shuffle(ORDERS, seed)
  const market = deck.splice(0, MARKET_SIZE)
  const empty = (): Player => ({ res: { fish: 0, veg: 0, rice: 0 }, hand: [], done: [] })
  const players: [Player, Player] = [empty(), empty()]
  for (const r of FIRST_PLAYER_BONUS) players[0].res[r] += 1
  return {
    round: 1,
    turnInRound: 0,
    first: 0,
    current: 0,
    players,
    spaces: {
      fish: null, veg: null, rice: null, assort: null,
      order: null, deliver1: null, deliver2: null, rooster: null,
    },
    roosterTaker: null,
    deck,
    market,
    rng,
    over: false,
    log: ['ゲーム開始！ 第1ラウンド'],
  }
}

export function legalActions(s: GameState): Action[] {
  if (s.over) return []
  const p = s.players[s.current]
  const acts: Action[] = []
  for (const sp of SPACE_IDS) {
    if (s.spaces[sp] !== null) continue
    switch (sp) {
      case 'fish':
      case 'veg':
      case 'rice':
      case 'assort':
        if (gainAmount(p, sp) > 0) acts.push({ type: 'place', space: sp })
        break
      case 'order':
        if (p.hand.length < HAND_LIMIT)
          for (const o of s.market) acts.push({ type: 'place', space: sp, orderId: o.id })
        break
      case 'deliver1':
      case 'deliver2':
        for (const o of p.hand)
          if (canAfford(p, o)) acts.push({ type: 'place', space: sp, orderId: o.id })
        break
      case 'rooster': {
        const open = RES.filter((r) => p.res[r] < CAP)
        if (open.length === 0) acts.push({ type: 'place', space: sp })
        for (const r of open) acts.push({ type: 'place', space: sp, res: r })
        break
      }
    }
  }
  if (acts.length === 0) acts.push({ type: 'pass' })
  return acts
}

const key = (a: Action) =>
  a.type === 'pass' ? 'pass' : `${a.space}|${a.orderId ?? ''}|${a.res ?? ''}`

export function isLegal(s: GameState, a: Action): boolean {
  return legalActions(s).some((x) => key(x) === key(a))
}

function pname(i: PlayerIndex) {
  return i === 0 ? 'プレイヤー1' : 'プレイヤー2'
}

/** アクションを適用して新しい状態を返す（元の状態は変更しない）。不正な手は例外。 */
export function applyAction(prev: GameState, a: Action): GameState {
  if (!isLegal(prev, a)) throw new Error('不正な手です: ' + JSON.stringify(a))
  const s = structuredClone(prev) as GameState
  const me = s.current
  const p = s.players[me]
  const name = pname(me)
  if (a.type === 'pass') {
    s.log.push(`${name}: 置ける場所がないのでパス`)
  } else {
    const spDef = SPACES.find((x) => x.id === a.space)!
    s.spaces[a.space] = me
    switch (a.space) {
      case 'fish':
      case 'veg':
      case 'rice': {
        const n = gain(p, a.space, 3)
        s.log.push(`${name}: ${spDef.name}で${RES_LABEL[a.space]}を${n}つ`)
        break
      }
      case 'assort':
        for (const r of RES) gain(p, r, 1)
        s.log.push(`${name}: ${spDef.name}で魚・野菜・米を1つずつ`)
        break
      case 'order': {
        const idx = s.market.findIndex((o) => o.id === a.orderId)
        const [o] = s.market.splice(idx, 1)
        p.hand.push(o)
        const next = s.deck.shift()
        if (next) s.market.push(next)
        s.log.push(`${name}: 注文所で「${o.name}」をもらった`)
        break
      }
      case 'deliver1':
      case 'deliver2': {
        const idx = p.hand.findIndex((o) => o.id === a.orderId)
        const [o] = p.hand.splice(idx, 1)
        for (const r of RES) p.res[r] -= o.cost[r]
        p.done.push(o)
        s.log.push(`${name}: 「${o.name}」を納品！ +${o.points}点`)
        break
      }
      case 'rooster':
        if (a.res) gain(p, a.res, 1)
        s.roosterTaker = me
        s.log.push(
          `${name}: 一番どり${a.res ? `で${RES_LABEL[a.res]}を1つ` : ''}（次のラウンドは先手）`,
        )
        break
    }
  }
  s.turnInRound += 1
  if (s.turnInRound >= TURNS_PER_ROUND) endRound(s)
  else s.current = ((s.first + s.turnInRound) % 2) as PlayerIndex
  if (s.log.length > 60) s.log = s.log.slice(-60)
  return s
}

function endRound(s: GameState) {
  const nextFirst: PlayerIndex = s.roosterTaker ?? other(s.first)
  for (const sp of SPACE_IDS) s.spaces[sp] = null
  s.roosterTaker = null
  if (s.round >= ROUNDS) {
    s.over = true
    s.log.push('ゲーム終了！')
    return
  }
  // 場の一番古い注文を入れ替える
  if (s.deck.length > 0 && s.market.length > 0) {
    s.market.shift()
    s.market.push(s.deck.shift()!)
  }
  s.round += 1
  s.turnInRound = 0
  s.first = nextFirst
  s.current = nextFirst
  s.log.push(`第${s.round}ラウンド（先手: ${pname(nextFirst)}）`)
}

export function scoreOf(p: Player): ScoreBreakdown {
  const orders = p.done.reduce((a, o) => a + o.points, 0)
  const count: Record<Res, number> = { fish: 0, veg: 0, rice: 0 }
  for (const o of p.done) count[o.cat] += 1
  const allCats = RES.every((r) => count[r] >= 1) ? 4 : 0
  const triple = RES.some((r) => count[r] >= 3) ? 3 : 0
  const penalty = p.hand.length
  return { orders, allCats, triple, penalty, total: orders + allCats + triple - penalty }
}

/** 勝者: 0 / 1 / null(引き分け)。同点は納品数、さらに同点は残り資源の合計で決める。 */
export function winnerOf(s: GameState): PlayerIndex | null {
  const [a, b] = s.players
  const sa = scoreOf(a).total
  const sb = scoreOf(b).total
  if (sa !== sb) return sa > sb ? 0 : 1
  if (a.done.length !== b.done.length) return a.done.length > b.done.length ? 0 : 1
  const ra = RES.reduce((t, r) => t + a.res[r], 0)
  const rb = RES.reduce((t, r) => t + b.res[r], 0)
  if (ra !== rb) return ra > rb ? 0 : 1
  return null
}
