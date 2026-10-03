// AI同士の自動対戦（シード固定）でバランスを確認する: npm run sim [ゲーム数]
import { chooseAction, type AiLevel } from '../src/game/ai'
import { ROUNDS, RES, applyAction, legalActions, newGame, scoreOf, winnerOf } from '../src/game/engine'
import type { SpaceId } from '../src/game/types'

const N = Number(process.argv[2] ?? 1000)

function run(l0: AiLevel, l1: AiLevel) {
  let w0 = 0, w1 = 0, draw = 0, sumTurns = 0, maxTurns = 0, firstWinFirstPlayerRounds = 0
  const spaceUse: Record<string, number> = {}
  let pts = [0, 0], delivered = [0, 0], cats3 = 0, triple = 0
  let rounds = 0, passes = 0, choiceSum = 0, lastChoiceSum = 0, lastCount = 0, tie = 0
  for (let seed = 1; seed <= N; seed++) {
    let s = newGame(seed * 7919)
    let rs = seed * 104729
    let turns = 0
    while (!s.over) {
      const lvl = s.current === 0 ? l0 : l1
      const [a, n] = chooseAction(s, lvl, rs)
      rs = n
      choiceSum += legalActions(s).length
      if (s.turnInRound === 5) { lastChoiceSum += legalActions(s).length; lastCount++ }
      if (a.type === 'pass') passes++
      if (a.type === 'place') spaceUse[a.space as SpaceId] = (spaceUse[a.space] ?? 0) + 1
      s = applyAction(s, a)
      turns++
    }
    sumTurns += turns
    maxTurns = Math.max(maxTurns, turns)
    const w = winnerOf(s)
    if (w === 0) w0++
    else if (w === 1) w1++
    else draw++
    for (const i of [0, 1] as const) {
      const sc = scoreOf(s.players[i])
      pts[i] += sc.total
      delivered[i] += s.players[i].done.length
      if (sc.allCats) cats3++
      if (sc.triple) triple++
    }
    rounds += ROUNDS
  }
  void tie; void firstWinFirstPlayerRounds; void RES; void rounds
  const pct = (x: number) => ((x / N) * 100).toFixed(1) + '%'
  console.log(`\n=== P1=${l0} vs P2=${l1}  (${N}ゲーム) ===`)
  console.log(`P1勝ち ${pct(w0)} / P2勝ち ${pct(w1)} / 引き分け ${pct(draw)}`)
  console.log(`平均手数 ${(sumTurns / N).toFixed(1)}  最大手数 ${maxTurns}`)
  console.log(`平均得点 P1 ${(pts[0] / N).toFixed(1)} / P2 ${(pts[1] / N).toFixed(1)}  平均納品数 P1 ${(delivered[0] / N).toFixed(2)} / P2 ${(delivered[1] / N).toFixed(2)}`)
  console.log(`3種類ボーナス達成率 ${pct(cats3 / 2)}  同種3枚ボーナス達成率 ${pct(triple / 2)}`)
  console.log(`1手あたりの平均選択肢数 ${(choiceSum / sumTurns).toFixed(1)} / ラウンド最後の手の平均選択肢数 ${(lastChoiceSum / lastCount).toFixed(1)} / パス回数(1ゲーム平均) ${(passes / N).toFixed(2)}`)
  const tot = Object.values(spaceUse).reduce((a, b) => a + b, 0)
  console.log('場所の使用率: ' + Object.entries(spaceUse).map(([k, v]) => `${k} ${((v / tot) * 100).toFixed(1)}%`).join(', '))
}

run('random', 'random')
run('greedy', 'random')
run('random', 'greedy')
run('greedy', 'greedy')
