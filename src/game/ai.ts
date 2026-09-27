import { LINES, applyMove, getValidMoves, isValidMove, type DraftPlacement } from './engine'
import type { RNG } from './rng'
import type { GameState, PlayerId } from './types'

export type AIStrategy = (state: GameState, rng: RNG) => DraftPlacement

/** Picks uniformly among all legal moves. Useful as a balance-testing baseline. */
export const randomAI: AIStrategy = (state, rng) => {
  const moves = getValidMoves(state)
  const pick = moves[Math.floor(rng() * moves.length)]
  return pick
}

/**
 * Greedy heuristic AI: for each candidate move, scores how much it improves the
 * placing player's advantage on every line through the chosen cell, with a small
 * tie-break that prefers claiming higher-value tiles (denying them to the opponent).
 */
export const greedyAI: AIStrategy = (state, rng) => {
  const moves = getValidMoves(state)
  const player: PlayerId = state.currentPlayer
  const opponent: PlayerId = player === 0 ? 1 : 0

  let best: DraftPlacement[] = []
  let bestScore = -Infinity

  for (const move of moves) {
    const next = applyMove(state, move)
    let score = 0
    for (const line of LINES) {
      if (!line.cells.includes(move.cellIndex)) continue
      let mine = 0
      let theirs = 0
      for (const idx of line.cells) {
        const cell = next.board[idx]
        if (!cell) continue
        if (cell.owner === player) mine += cell.value
        else theirs += cell.value
      }
      score += mine - theirs
    }
    const tile = state.market.find((t) => t.id === move.tileId)
    score += (tile?.value ?? 0) * 0.01

    if (score > bestScore + 1e-9) {
      bestScore = score
      best = [move]
    } else if (Math.abs(score - bestScore) <= 1e-9) {
      best.push(move)
    }
  }

  return best[Math.floor(rng() * best.length)]
}

export function assertMoveIsLegal(state: GameState, move: DraftPlacement): void {
  if (!isValidMove(state, move)) {
    throw new Error('AI produced an illegal move')
  }
}
