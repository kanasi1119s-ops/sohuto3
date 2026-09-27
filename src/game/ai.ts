import {
  WIN_LENGTH,
  canForge,
  canForceWinNextMove,
  getEmptyCells,
  getForgeableTargets,
  indexOf,
  inBounds,
  otherPlayer,
  rowColOf,
} from './engine'
import { pick } from './rng'
import type { Action, Cell, GameState, Player } from './types'

export type Difficulty = 'random' | 'greedy'

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

/**
 * cell に color の石を置いたと仮定した場合の、その1方向あたりのライン評価値の合計。
 * 実際には石を置かず、周囲の既存石だけを読んで評価するため盤面を複製しなくてよい。
 */
function lineScoreForColor(board: readonly Cell[], size: number, cell: number, color: Player): number {
  const [row, col] = rowColOf(cell, size)
  let total = 0
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1
    let openEnds = 0

    let r = row + dr
    let c = col + dc
    while (inBounds(r, c, size) && board[indexOf(r, c, size)] === color) {
      count++
      r += dr
      c += dc
    }
    if (inBounds(r, c, size) && board[indexOf(r, c, size)] === null) openEnds++

    r = row - dr
    c = col - dc
    while (inBounds(r, c, size) && board[indexOf(r, c, size)] === color) {
      count++
      r -= dr
      c -= dc
    }
    if (inBounds(r, c, size) && board[indexOf(r, c, size)] === null) openEnds++

    if (count >= WIN_LENGTH) total += 1_000_000
    else total += count * count * count * (openEnds + 1)
  }
  return total
}

function evaluatePlacement(board: readonly Cell[], size: number, cell: number, me: Player, opponent: Player): number {
  return lineScoreForColor(board, size, cell, me) + 0.9 * lineScoreForColor(board, size, cell, opponent)
}

function rankPlacements(board: readonly Cell[], size: number, me: Player, opponent: Player) {
  return getEmptyCells(board)
    .map((cell) => ({ cell, score: evaluatePlacement(board, size, cell, me, opponent) }))
    .sort((a, b) => b.score - a.score)
}

function bestPlacementOn(board: readonly Cell[], size: number, me: Player, opponent: Player) {
  return rankPlacements(board, size, me, opponent)[0]
}

const TIE_BREAK_RATIO = 0.02

/**
 * スコア上位の候補から、「その手を指した直後に相手が即座に勝てる（自殺手）」ものを除外して選ぶ。
 * 安全な候補が複数あり、かつスコアが僅差（上位2%以内）の場合は rng でタイブレークする
 * （完全に決定論的だと同一AI同士の対戦が毎回1パターンに固定されてしまうため）。
 * 全候補が自殺手にしかならない場合（詰み）は、やむを得ずスコア最上位を返す。
 */
function pickSafest<T extends { score: number }>(
  ranked: T[],
  boardAfter: (candidate: T) => Cell[],
  size: number,
  opponent: Player,
  opponentForgeCharges: number,
  rng: () => number,
): T {
  // ranked はスコア降順。安全確認(canForceWinNextMove)は高コストなので、
  // 最初の安全候補が見つかるまでのみ評価し、閾値を下回った時点で打ち切る（早期終了）。
  let threshold = -Infinity
  let foundTop = false
  const group: T[] = []
  for (const candidate of ranked) {
    if (foundTop && candidate.score < threshold) break
    if (canForceWinNextMove(boardAfter(candidate), size, opponent, opponentForgeCharges)) continue
    if (!foundTop) {
      foundTop = true
      threshold = candidate.score - Math.max(1, Math.abs(candidate.score) * TIE_BREAK_RATIO)
    }
    if (candidate.score >= threshold) group.push(candidate)
  }
  if (group.length === 0) return ranked[0]
  return pick(group, rng)
}

function chooseGreedyAction(state: GameState, rng: () => number): Action {
  const me = state.currentPlayer
  const opponent = otherPlayer(me)
  const opponentForge = state.forgeCharges[opponent]

  const placementRanked = rankPlacements(state.board, state.size, me, opponent)
  const safePlacement = pickSafest(
    placementRanked,
    (candidate) => {
      const b = state.board.slice()
      b[candidate.cell] = me
      return b
    },
    state.size,
    opponent,
    opponentForge,
    rng,
  )

  if (canForge(state)) {
    const targets = getForgeableTargets(state)
    const forgeCandidates: { target: number; cell: number; score: number }[] = []
    for (const target of targets) {
      const simBoard = state.board.slice()
      simBoard[target] = null
      for (const candidate of rankPlacements(simBoard, state.size, me, opponent)) {
        forgeCandidates.push({ target, cell: candidate.cell, score: candidate.score })
      }
    }
    forgeCandidates.sort((a, b) => b.score - a.score)
    const safeForge =
      forgeCandidates.length > 0
        ? pickSafest(
            forgeCandidates,
            (candidate) => {
              const b = state.board.slice()
              b[candidate.target] = null
              b[candidate.cell] = me
              return b
            },
            state.size,
            opponent,
            opponentForge,
            rng,
          )
        : null

    // フォージはコスト（限られた3回）があるため、明確に上回る場合のみ採用する
    if (safeForge && safeForge.score > safePlacement.score * 1.15) {
      return { type: 'forge', target: safeForge.target, cell: safeForge.cell }
    }
  }

  return { type: 'place', cell: safePlacement.cell }
}

function chooseRandomAction(state: GameState, rng: () => number): Action {
  if (canForge(state) && rng() < 0.15) {
    const targets = getForgeableTargets(state)
    const target = pick(targets, rng)
    const simBoard = state.board.slice()
    simBoard[target] = null
    const emptyCells = getEmptyCells(simBoard)
    const cell = pick(emptyCells, rng)
    return { type: 'forge', target, cell }
  }
  const cell = pick(getEmptyCells(state.board), rng)
  return { type: 'place', cell }
}

function chooseOpeningResponse(state: GameState, difficulty: Difficulty, rng: () => number): Action {
  const placedIndex = state.board.findIndex((c) => c !== null)
  if (difficulty === 'random') {
    return rng() < 0.5 ? { type: 'swap' } : { type: 'place', cell: pick(getEmptyCells(state.board), rng) }
  }
  const [row, col] = rowColOf(placedIndex, state.size)
  const center = (state.size - 1) / 2
  const distFromCenter = Math.abs(row - center) + Math.abs(col - center)
  // 中央に近い強力な初手はスワップして奪う
  if (distFromCenter <= 2) return { type: 'swap' }
  const best = bestPlacementOn(state.board, state.size, state.currentPlayer, otherPlayer(state.currentPlayer))
  return { type: 'place', cell: best.cell }
}

export function chooseAction(state: GameState, difficulty: Difficulty, rng: () => number): Action {
  if (state.phase === 'opening-wait-swap' && state.currentPlayer === 'B') {
    return chooseOpeningResponse(state, difficulty, rng)
  }
  if (difficulty === 'random') return chooseRandomAction(state, rng)
  return chooseGreedyAction(state, rng)
}

/**
 * パイルールの効果測定用: 開幕直後でも常に「続行（配置）」を選ばせ、スワップを行わない。
 * バランス検証シミュレーションでの比較対象（パイルール無し版）としてのみ使用する。
 */
export function choosePlacementOnly(state: GameState, difficulty: Difficulty, rng: () => number): Action {
  if (difficulty === 'random') {
    return { type: 'place', cell: pick(getEmptyCells(state.board), rng) }
  }
  const best = bestPlacementOn(state.board, state.size, state.currentPlayer, otherPlayer(state.currentPlayer))
  return { type: 'place', cell: best.cell }
}
