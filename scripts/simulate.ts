/**
 * LinkForge バランス検証シミュレーター
 * 使い方: npm run simulate
 * AI同士を大量に自動対戦させ、先手/後手勝率・平均ターン数・フォージ採用率などを計測する。
 */
import { chooseAction, choosePlacementOnly, type Difficulty } from '../src/game/ai'
import { MAX_TURNS, applyAction, createInitialState, getLargestGroupSize } from '../src/game/engine'
import { createRng } from '../src/game/rng'
import type { GameState, Player } from '../src/game/types'

interface GameResult {
  winner: Player | 'draw'
  actions: number
  forgeUsed: Record<Player, number>
  swapped: boolean
  largestA: number
  largestB: number
}

function playGame(seed: number, diffA: Difficulty, diffB: Difficulty, allowSwap: boolean): GameResult {
  let state: GameState = createInitialState()
  const rng = createRng(seed)
  const forgeUsed: Record<Player, number> = { A: 0, B: 0 }
  let swapped = false
  let actions = 0

  while (state.phase !== 'finished') {
    actions++
    if (actions > MAX_TURNS + 10) {
      throw new Error(`ゲームが終了しませんでした seed=${seed} actions=${actions}`)
    }
    const diff = state.currentPlayer === 'A' ? diffA : diffB
    const isOpeningDecision = state.phase === 'opening-wait-swap' && state.currentPlayer === 'B'
    const action = isOpeningDecision && !allowSwap ? choosePlacementOnly(state, diff, rng) : chooseAction(state, diff, rng)

    if (action.type === 'swap') swapped = true
    if (action.type === 'forge') forgeUsed[state.currentPlayer]++

    const result = applyAction(state, action)
    if (result.error) {
      throw new Error(`AIが不正な手を選択しました seed=${seed} error=${result.error} action=${JSON.stringify(action)}`)
    }
    state = result.state
  }

  return {
    winner: state.winner as Player | 'draw',
    actions,
    forgeUsed,
    swapped,
    largestA: getLargestGroupSize(state.board, state.size, 'A'),
    largestB: getLargestGroupSize(state.board, state.size, 'B'),
  }
}

interface BatchSummary {
  label: string
  games: number
  winRateA: number
  winRateB: number
  drawRate: number
  avgActions: number
  maxActions: number
  minActions: number
  avgForgeA: number
  avgForgeB: number
  swapRate: number
}

function runBatch(
  label: string,
  n: number,
  diffA: Difficulty,
  diffB: Difficulty,
  allowSwap: boolean,
  seedOffset: number,
): BatchSummary {
  let winsA = 0
  let winsB = 0
  let draws = 0
  let totalActions = 0
  let maxActions = 0
  let minActions = Infinity
  let totalForgeA = 0
  let totalForgeB = 0
  let swaps = 0

  for (let i = 0; i < n; i++) {
    const result = playGame(seedOffset + i, diffA, diffB, allowSwap)
    if (result.winner === 'A') winsA++
    else if (result.winner === 'B') winsB++
    else draws++
    totalActions += result.actions
    maxActions = Math.max(maxActions, result.actions)
    minActions = Math.min(minActions, result.actions)
    totalForgeA += result.forgeUsed.A
    totalForgeB += result.forgeUsed.B
    if (result.swapped) swaps++
  }

  return {
    label,
    games: n,
    winRateA: winsA / n,
    winRateB: winsB / n,
    drawRate: draws / n,
    avgActions: totalActions / n,
    maxActions,
    minActions,
    avgForgeA: totalForgeA / n,
    avgForgeB: totalForgeB / n,
    swapRate: swaps / n,
  }
}

function printSummary(s: BatchSummary) {
  console.log(`\n=== ${s.label} (n=${s.games}) ===`)
  console.log(`先手(A)勝率: ${(s.winRateA * 100).toFixed(1)}%`)
  console.log(`後手(B)勝率: ${(s.winRateB * 100).toFixed(1)}%`)
  console.log(`引き分け率: ${(s.drawRate * 100).toFixed(1)}%`)
  console.log(`平均手数: ${s.avgActions.toFixed(1)} / 最長: ${s.maxActions} / 最短: ${s.minActions}`)
  console.log(`平均フォージ使用回数: A=${s.avgForgeA.toFixed(2)} B=${s.avgForgeB.toFixed(2)}`)
  console.log(`スワップ発生率(パイルール有りの場合): ${(s.swapRate * 100).toFixed(1)}%`)
}

// greedy同士は1手ごとに「自殺手回避」の先読み評価を行うため計算コストが高い。
// random同士は評価コストが低いため、より多くの試行回数を確保できる。
const N_RANDOM = Number(process.argv[2] ?? 1500)
const N_GREEDY = Number(process.argv[3] ?? 300)

const batches: BatchSummary[] = [
  runBatch('greedy vs greedy（パイルール有り・本採用ルール）', N_GREEDY, 'greedy', 'greedy', true, 1_000_000),
  runBatch('greedy vs greedy（パイルール無し・比較対照）', N_GREEDY, 'greedy', 'greedy', false, 2_000_000),
  runBatch('random vs random（終端性・堅牢性チェック）', N_RANDOM, 'random', 'random', true, 3_000_000),
  runBatch('greedy(A) vs random(B)（AI強さのサニティチェック）', N_GREEDY, 'greedy', 'random', true, 4_000_000),
  runBatch('random(A) vs greedy(B)（AI強さのサニティチェック）', N_GREEDY, 'random', 'greedy', true, 5_000_000),
]

for (const b of batches) printSummary(b)

console.log('\n=== JSON ===')
console.log(JSON.stringify(batches, null, 2))
