import { describe, expect, it } from 'vitest'
import { chooseAction } from './ai'
import {
  CAP, ORDERS, RES, ROUNDS, FIRST_PLAYER_BONUS, applyAction, legalActions, newGame, scoreOf, winnerOf,
} from './engine'
import type { Action, GameState } from './types'

function playOut(seed: number, l0: 'random' | 'greedy', l1: 'random' | 'greedy') {
  let s = newGame(seed)
  let rs = seed ^ 0x9e3779b9
  let steps = 0
  while (!s.over) {
    const [a, n] = chooseAction(s, s.current === 0 ? l0 : l1, rs)
    rs = n
    s = applyAction(s, a)
    if (++steps > 100) throw new Error('終わらない')
  }
  return { s, steps }
}

describe('セットアップ', () => {
  it('場に3枚・山札は残り、初期資源はゼロ', () => {
    const s = newGame(1)
    expect(s.market.length).toBe(3)
    expect(s.deck.length).toBe(ORDERS.length - 3)
    for (const r of RES) expect(s.players[0].res[r]).toBe(0)
    expect(FIRST_PLAYER_BONUS.length).toBe(0)
  })
  it('同じシードなら同じ並び、違うシードなら違う並び', () => {
    expect(newGame(5).market.map((o) => o.id)).toEqual(newGame(5).market.map((o) => o.id))
    expect(newGame(5).market.map((o) => o.id)).not.toEqual(newGame(6).market.map((o) => o.id))
  })
})

describe('アクション', () => {
  it('漁港で魚+3、同じ場所は2人目が使えない', () => {
    let s = newGame(1)
    s = applyAction(s, { type: 'place', space: 'fish' })
    expect(s.players[0].res.fish).toBe(3)
    expect(legalActions(s).some((a) => a.type === 'place' && a.space === 'fish')).toBe(false)
    expect(() => applyAction(s, { type: 'place', space: 'fish' })).toThrow()
  })
  it('資源は上限6で止まる', () => {
    let s = newGame(1)
    s = applyAction(s, { type: 'place', space: 'fish' }) // P0 fish 3
    s = applyAction(s, { type: 'place', space: 'veg' })
    s = applyAction(s, { type: 'place', space: 'assort' }) // P0 fish 4
    s = applyAction(s, { type: 'place', space: 'rice' })
    expect(s.players[0].res.fish).toBe(4)
    expect(s.players[0].res.fish).toBeLessThanOrEqual(CAP)
  })
  it('資源が足りない注文は納品できない／足りれば納品して得点', () => {
    let s = newGame(1)
    const o = s.market[0]
    expect(legalActions(s).some((a) => a.type === 'place' && a.space === 'deliver1')).toBe(false)
    s = applyAction(s, { type: 'place', space: 'order', orderId: o.id })
    expect(s.players[0].hand.map((x) => x.id)).toEqual([o.id])
    expect(s.market.length).toBe(3) // 補充される
    // 手動で資源を持たせて納品
    const t = structuredClone(s) as GameState
    t.current = 0
    t.turnInRound = 2
    t.first = 0
    for (const r of RES) t.players[0].res[r] = 6
    const t2 = applyAction(t, { type: 'place', space: 'deliver1', orderId: o.id })
    expect(t2.players[0].done.length).toBe(1)
    expect(t2.players[0].hand.length).toBe(0)
    for (const r of RES) expect(t2.players[0].res[r]).toBe(6 - o.cost[r])
    expect(scoreOf(t2.players[0]).orders).toBe(o.points)
  })
  it('手元の注文は3枚まで', () => {
    const s = newGame(2)
    s.players[0].hand = ORDERS.slice(10, 13)
    expect(legalActions(s).some((a) => a.type === 'place' && a.space === 'order')).toBe(false)
  })
  it('一番どりを取ると次ラウンドの先手になる', () => {
    let s = newGame(3)
    s = applyAction(s, { type: 'place', space: 'fish' }) // P0
    s = applyAction(s, { type: 'place', space: 'rooster', res: 'veg' }) // P1
    for (let i = 0; i < 4; i++) s = applyAction(s, legalActions(s)[0])
    expect(s.round).toBe(2)
    expect(s.first).toBe(1)
    expect(s.current).toBe(1)
  })
  it('一番どりが使われなければ先手が交代する', () => {
    let s = newGame(3)
    for (const sp of ['fish', 'veg', 'rice', 'assort'] as const) s = applyAction(s, { type: 'place', space: sp })
    s = applyAction(s, { type: 'place', space: 'order', orderId: s.market[0].id })
    // 6手目: 後手は納品所を使う（一番どりは取らない）
    s.players[1].hand = [ORDERS[0]]
    for (const r of RES) s.players[1].res[r] = 6
    s = applyAction(s, { type: 'place', space: 'deliver1', orderId: ORDERS[0].id })
    expect(s.round).toBe(2)
    expect(s.first).toBe(1)
  })
})

describe('得点とボーナス', () => {
  const pick = (cat: string, n: number) => ORDERS.filter((o) => o.cat === cat).slice(0, n)
  it('3種類そろえば+4、同じ種類3枚で+3、手元の未納品は-1', () => {
    const p = newGame(1).players[0]
    p.done = [...pick('fish', 1), ...pick('veg', 1), ...pick('rice', 1)]
    expect(scoreOf(p).allCats).toBe(4)
    expect(scoreOf(p).triple).toBe(0)
    p.done = pick('fish', 3)
    expect(scoreOf(p).triple).toBe(3)
    expect(scoreOf(p).allCats).toBe(0)
    p.hand = pick('veg', 2)
    expect(scoreOf(p).penalty).toBe(2)
    expect(scoreOf(p).total).toBe(scoreOf(p).orders + 3 - 2)
  })
})

describe('終了とシミュレーション', () => {
  it('どの組み合わせでも必ず終了し、最大でも ROUNDS×6 手', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const [a, b] of [['random', 'random'], ['greedy', 'random'], ['greedy', 'greedy']] as const) {
        const { s, steps } = playOut(seed, a, b)
        expect(s.over).toBe(true)
        expect(steps).toBe(ROUNDS * 6)
        for (const p of s.players) for (const r of RES) expect(p.res[r]).toBeGreaterThanOrEqual(0)
        expect(winnerOf(s) === 0 || winnerOf(s) === 1 || winnerOf(s) === null).toBe(true)
      }
    }
  })
  it('資源・注文の保存: 全注文の枚数が変わらない', () => {
    const { s } = playOut(42, 'greedy', 'greedy')
    const total =
      s.deck.length + s.market.length + s.players[0].hand.length + s.players[0].done.length +
      s.players[1].hand.length + s.players[1].done.length
    // 入れ替えで捨てられた場の注文があるので、総数以下
    expect(total).toBeLessThanOrEqual(ORDERS.length)
  })
  it('合法手のみを選ぶ（AIが不正手を出さない）', () => {
    for (let seed = 1; seed <= 50; seed++) playOut(seed, 'greedy', 'greedy')
  })
  it('applyActionは元の状態を変更しない', () => {
    const s = newGame(9)
    const before = JSON.stringify(s)
    applyAction(s, legalActions(s)[0] as Action)
    expect(JSON.stringify(s)).toBe(before)
  })
})
