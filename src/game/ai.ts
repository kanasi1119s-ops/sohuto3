import { largestConnectedGroup } from './board'
import { legalPositions } from './engine'
import { randomInt } from './rng'
import type { GameState, PlayerId, Position } from './types'

export type AiDifficulty = 'greedy' | 'random'

function otherPlayer(player: PlayerId): PlayerId {
  return player === 'P1' ? 'P2' : 'P1'
}

function pickRandom(positions: Position[], seed: number): { position: Position; nextSeed: number } {
  const r = randomInt(seed, positions.length)
  return { position: positions[r.value], nextSeed: r.nextState }
}

/**
 * Chooses a move for the AI given the currently drawn card.
 * Greedy strategy: for PLACE/JUMP, maximize the AI's own resulting largest connected group.
 * For BLOCK, maximize the opponent's largest group *that gets denied* (i.e. place where the
 * opponent would have grown the most).
 */
export function chooseAiMove(
  state: GameState,
  difficulty: AiDifficulty,
  seed: number,
): { position: Position; nextSeed: number } {
  const candidates = legalPositions(state)
  if (candidates.length === 0) throw new Error('No legal moves available for AI.')
  if (difficulty === 'random') return pickRandom(candidates, seed)

  const card = state.lastDrawnCard!
  const me = state.currentPlayer
  const opponent = otherPlayer(me)

  let bestScore = -Infinity
  let bestPositions: Position[] = []

  for (const pos of candidates) {
    const boardCopy = state.board.map((row) => row.slice())
    const evalOwner = card.type === 'BLOCK' ? opponent : me
    boardCopy[pos.row][pos.col] = evalOwner
    const score = largestConnectedGroup(state.config, boardCopy, evalOwner)

    if (score > bestScore) {
      bestScore = score
      bestPositions = [pos]
    } else if (score === bestScore) {
      bestPositions.push(pos)
    }
  }

  return pickRandom(bestPositions, seed)
}
