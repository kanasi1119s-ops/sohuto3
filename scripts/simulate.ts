/**
 * AI vs AI balance simulation for ConneCross.
 * Usage: npm run simulate -- --games 2000 [--p1=greedy] [--p2=greedy]
 */
import { chooseAiMove, type AiDifficulty } from '../src/game/ai'
import { applyPlacement, createGame, drawCard, legalPositions } from '../src/game/engine'
import type { GameState } from '../src/game/types'

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (name: string, def: string) => {
    const found = args.find((a) => a.startsWith(`--${name}=`))
    return found ? found.split('=')[1] : def
  }
  return {
    games: parseInt(get('games', '2000'), 10),
    p1: get('p1', 'greedy') as AiDifficulty,
    p2: get('p2', 'greedy') as AiDifficulty,
  }
}

function playOneGame(seed: number, p1Strategy: AiDifficulty, p2Strategy: AiDifficulty) {
  let state: GameState = createGame(seed)
  let aiSeed = seed * 2654435761 + 1
  let turns = 0

  while (state.status === 'PLAYING') {
    state = drawCard(state)
    const strategy = state.currentPlayer === 'P1' ? p1Strategy : p2Strategy
    const legal = legalPositions(state)
    if (legal.length === 0) throw new Error('No legal moves - engine bug (should never happen).')
    const { position, nextSeed } = chooseAiMove(state, strategy, aiSeed)
    aiSeed = nextSeed + 1
    state = applyPlacement(state, position)
    turns++
    if (turns > 60) throw new Error('Game did not terminate within expected turn bound.')
  }

  return { result: state.result!, turns }
}

function main() {
  const { games, p1, p2 } = parseArgs()
  let p1Wins = 0
  let p2Wins = 0
  let draws = 0
  let totalTurns = 0
  let maxTurns = 0
  let minTurns = Infinity
  const maxGroupSizes: number[] = []

  for (let i = 0; i < games; i++) {
    const seed = 1_000_003 * (i + 1) + 17
    const { result, turns } = playOneGame(seed, p1, p2)
    if (result.winner === 'P1') p1Wins++
    else if (result.winner === 'P2') p2Wins++
    else draws++
    totalTurns += turns
    maxTurns = Math.max(maxTurns, turns)
    minTurns = Math.min(minTurns, turns)
    maxGroupSizes.push(Math.max(result.scores.P1.maxGroup, result.scores.P2.maxGroup))
  }

  const avgTurns = totalTurns / games
  const avgMaxGroup = maxGroupSizes.reduce((a, b) => a + b, 0) / games

  console.log(`\n=== ConneCross AIシミュレーション結果 ===`)
  console.log(`試行回数: ${games} games (P1=${p1}, P2=${p2})`)
  console.log(`P1(先手) 勝率: ${((p1Wins / games) * 100).toFixed(1)}% (${p1Wins}勝)`)
  console.log(`P2(後手) 勝率: ${((p2Wins / games) * 100).toFixed(1)}% (${p2Wins}勝)`)
  console.log(`引き分け率: ${((draws / games) * 100).toFixed(1)}% (${draws})`)
  console.log(`平均ターン数: ${avgTurns.toFixed(1)} / 最短: ${minTurns} / 最長: ${maxTurns}`)
  console.log(`平均最大連結グループサイズ: ${avgMaxGroup.toFixed(1)}`)
  console.log(`==========================================\n`)
}

main()
