/**
 * Runs many AI-vs-AI games to check for structural imbalance (first-player advantage,
 * dominant strategies) before humans playtest. Run with: npm run simulate
 */
import { applyMove, computeScore, createInitialState, isTerminal } from '../src/game/engine'
import { greedyAI, randomAI, type AIStrategy } from '../src/game/ai'
import { mulberry32 } from '../src/game/rng'

interface MatchupResult {
  name: string
  games: number
  p0Wins: number
  p1Wins: number
  draws: number
  p0AvgLinePoints: number
  p1AvgLinePoints: number
  turnsAlwaysEqualTo16: boolean
}

function runMatchup(name: string, p0Strategy: AIStrategy, p1Strategy: AIStrategy, games: number, seedOffset: number): MatchupResult {
  let p0Wins = 0
  let p1Wins = 0
  let draws = 0
  let p0LinePointsTotal = 0
  let p1LinePointsTotal = 0
  let turnsAlwaysEqualTo16 = true

  for (let g = 0; g < games; g++) {
    const seed = seedOffset + g
    let state = createInitialState(seed)
    const rng = mulberry32(seed * 7919 + 13)
    let turns = 0
    while (!isTerminal(state)) {
      const strategy = state.currentPlayer === 0 ? p0Strategy : p1Strategy
      const move = strategy(state, rng)
      state = applyMove(state, move)
      turns++
    }
    if (turns !== 16) turnsAlwaysEqualTo16 = false

    const result = computeScore(state)
    p0LinePointsTotal += result.linePoints[0]
    p1LinePointsTotal += result.linePoints[1]
    if (result.winner === 0) p0Wins++
    else if (result.winner === 1) p1Wins++
    else draws++
  }

  return {
    name,
    games,
    p0Wins,
    p1Wins,
    draws,
    p0AvgLinePoints: p0LinePointsTotal / games,
    p1AvgLinePoints: p1LinePointsTotal / games,
    turnsAlwaysEqualTo16,
  }
}

function printResult(r: MatchupResult) {
  const p0Rate = ((r.p0Wins / r.games) * 100).toFixed(1)
  const p1Rate = ((r.p1Wins / r.games) * 100).toFixed(1)
  const drawRate = ((r.draws / r.games) * 100).toFixed(1)
  console.log(`\n## ${r.name} (${r.games} games)`)
  console.log(`- 先手(P0)勝率: ${p0Rate}%  後手(P1)勝率: ${p1Rate}%  引き分け: ${drawRate}%`)
  console.log(`- 平均ライン得点: P0=${r.p0AvgLinePoints.toFixed(2)} / P1=${r.p1AvgLinePoints.toFixed(2)} (満点10)`)
  console.log(`- 全ゲームが16手で終了: ${r.turnsAlwaysEqualTo16 ? 'YES' : 'NO (要調査)'}`)
}

const GAMES = 5000

const results = [
  runMatchup('Random vs Random (基礎検証)', randomAI, randomAI, GAMES, 1_000_000),
  runMatchup('Greedy(先手) vs Random(後手)', greedyAI, randomAI, GAMES, 2_000_000),
  runMatchup('Random(先手) vs Greedy(後手)', randomAI, greedyAI, GAMES, 3_000_000),
  runMatchup('Greedy vs Greedy (先手優位の検証)', greedyAI, greedyAI, GAMES, 4_000_000),
]

console.log('# ラインクラフト シミュレーション結果\n')
console.log(`各対戦 ${GAMES} 試行 / シード固定で再現可能`)
for (const r of results) printResult(r)

console.log('\n## 判定基準との照合')
const greedyMirror = results[3]
const p0Rate = greedyMirror.p0Wins / greedyMirror.games
console.log(`- Greedy同士の先手勝率が 45%〜55% の範囲内か: ${p0Rate >= 0.45 && p0Rate <= 0.55 ? 'OK' : `要注意 (${(p0Rate * 100).toFixed(1)}%)`}`)
const greedyBeatsRandom = results[1].p0Wins / results[1].games > 0.5
console.log(`- Greedy が Random に有意に勝ち越す（支配戦略ではなく実力差として妥当）か: ${greedyBeatsRandom ? 'OK' : '要注意'}`)
