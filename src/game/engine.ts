import { buildTileSet } from './deck'
import { mulberry32, shuffle } from './rng'
import type {
  Cell,
  GameState,
  Line,
  LineResult,
  Move,
  PlayerId,
  ScoreResult,
  Tile,
} from './types'
import { BOARD_SIZE, CELL_COUNT, MARKET_SIZE, TILES_PER_PLAYER } from './types'

/** All 10 scoring lines: 4 rows, 4 cols, 2 diagonals, as cell-index tuples. */
export const LINES: ReadonlyArray<{ kind: LineResult['kind']; index: number; cells: Line }> = (() => {
  const lines: { kind: LineResult['kind']; index: number; cells: Line }[] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    lines.push({ kind: 'row', index: r, cells: Array.from({ length: BOARD_SIZE }, (_, c) => r * BOARD_SIZE + c) })
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    lines.push({ kind: 'col', index: c, cells: Array.from({ length: BOARD_SIZE }, (_, r) => r * BOARD_SIZE + c) })
  }
  lines.push({ kind: 'diag', index: 0, cells: Array.from({ length: BOARD_SIZE }, (_, i) => i * BOARD_SIZE + i) })
  lines.push({
    kind: 'diag',
    index: 1,
    cells: Array.from({ length: BOARD_SIZE }, (_, i) => i * BOARD_SIZE + (BOARD_SIZE - 1 - i)),
  })
  return lines
})()

/**
 * Snake draft order: 0,1,1,0,0,1,1,0,... (repeating blocks of 4).
 * This removes the "first pick every round" tempo advantage a strict
 * alternating order would give player 0 — see docs/debug-log.md Round 1.
 * `turnIndex` is 0-based (turnNumber - 1).
 */
export function playerForTurnIndex(turnIndex: number): PlayerId {
  const pattern: PlayerId[] = [0, 1, 1, 0]
  return pattern[turnIndex % 4]
}

export function createInitialState(seed: number): GameState {
  const tiles = shuffle(buildTileSet(), mulberry32(seed))
  const market = tiles.slice(0, MARKET_SIZE)
  const deck = tiles.slice(MARKET_SIZE)
  return {
    board: Array.from({ length: CELL_COUNT }, () => null as Cell),
    deck,
    market,
    currentPlayer: playerForTurnIndex(0),
    placedCount: [0, 0],
    turnNumber: 1,
    history: [],
  }
}

export function isTerminal(state: GameState): boolean {
  return state.board.every((cell) => cell !== null)
}

export function emptyCellIndices(state: GameState): number[] {
  const result: number[] = []
  state.board.forEach((cell, i) => {
    if (cell === null) result.push(i)
  })
  return result
}

export interface DraftPlacement {
  tileId: number
  cellIndex: number
}

/** All legal (tile, cell) combinations for the current player. Empty once the game is terminal. */
export function getValidMoves(state: GameState): DraftPlacement[] {
  if (isTerminal(state)) return []
  const moves: DraftPlacement[] = []
  for (const tile of state.market) {
    for (const cellIndex of emptyCellIndices(state)) {
      moves.push({ tileId: tile.id, cellIndex })
    }
  }
  return moves
}

export function isValidMove(state: GameState, move: DraftPlacement): boolean {
  if (isTerminal(state)) return false
  const tileInMarket = state.market.some((t) => t.id === move.tileId)
  if (!tileInMarket) return false
  if (move.cellIndex < 0 || move.cellIndex >= CELL_COUNT) return false
  return state.board[move.cellIndex] === null
}

/** Applies a draft+placement move, returning a brand-new state (input is never mutated). */
export function applyMove(state: GameState, move: DraftPlacement): GameState {
  if (!isValidMove(state, move)) {
    throw new Error(`Invalid move: tileId=${move.tileId} cellIndex=${move.cellIndex}`)
  }
  const tile = state.market.find((t) => t.id === move.tileId) as Tile
  const board = state.board.slice()
  board[move.cellIndex] = { ...tile, owner: state.currentPlayer }

  const remainingMarket = state.market.filter((t) => t.id !== move.tileId)
  const deck = state.deck.slice()
  if (remainingMarket.length < MARKET_SIZE && deck.length > 0) {
    remainingMarket.push(deck.shift() as Tile)
  }

  const placedCount: [number, number] = [...state.placedCount]
  placedCount[state.currentPlayer] += 1

  const move_: Move = {
    turnNumber: state.turnNumber,
    player: state.currentPlayer,
    tileId: tile.id,
    value: tile.value,
    cellIndex: move.cellIndex,
  }

  return {
    board,
    deck,
    market: remainingMarket,
    currentPlayer: playerForTurnIndex(state.turnNumber), // state.turnNumber is the next turn's 0-based index
    placedCount,
    turnNumber: state.turnNumber + 1,
    history: [...state.history, move_],
  }
}

export function computeScore(state: GameState): ScoreResult {
  const lines: LineResult[] = LINES.map((line) => {
    const sumByPlayer: [number, number] = [0, 0]
    for (const idx of line.cells) {
      const cell = state.board[idx]
      if (cell) sumByPlayer[cell.owner] += cell.value
    }
    const winner: PlayerId | 'tie' =
      sumByPlayer[0] === sumByPlayer[1] ? 'tie' : sumByPlayer[0] > sumByPlayer[1] ? 0 : 1
    return { cells: line.cells, kind: line.kind, index: line.index, sumByPlayer, winner }
  })

  const linePoints: [number, number] = [0, 0]
  for (const line of lines) {
    if (line.winner !== 'tie') linePoints[line.winner] += 1
  }

  const totalValue: [number, number] = [0, 0]
  for (const cell of state.board) {
    if (cell) totalValue[cell.owner] += cell.value
  }

  let winner: PlayerId | 'draw'
  if (linePoints[0] !== linePoints[1]) {
    winner = linePoints[0] > linePoints[1] ? 0 : 1
  } else if (totalValue[0] !== totalValue[1]) {
    winner = totalValue[0] > totalValue[1] ? 0 : 1
  } else {
    winner = 'draw'
  }

  return { lines, linePoints, totalValue, winner }
}

export const GAME_CONSTANTS = { BOARD_SIZE, CELL_COUNT, MARKET_SIZE, TILES_PER_PLAYER }
