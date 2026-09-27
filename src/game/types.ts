export type PlayerId = 0 | 1

export interface Tile {
  id: number
  value: 1 | 2 | 3 | 4
}

export interface PlacedTile extends Tile {
  owner: PlayerId
}

export type Cell = PlacedTile | null

export const BOARD_SIZE = 4
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE
export const MARKET_SIZE = 3
export const TILES_PER_PLAYER = CELL_COUNT / 2

export interface GameState {
  board: Cell[] // length CELL_COUNT, row-major
  deck: Tile[] // remaining face-down tiles, deck[0] is the top
  market: Tile[] // up to MARKET_SIZE face-up tiles available to draft
  currentPlayer: PlayerId
  placedCount: [number, number] // tiles placed so far per player
  turnNumber: number // 1-indexed, increments after each placement
  history: Move[]
}

export interface Move {
  turnNumber: number
  player: PlayerId
  tileId: number
  value: number
  cellIndex: number
}

export type Line = readonly number[] // 4 cell indices

export interface LineResult {
  cells: Line
  kind: 'row' | 'col' | 'diag'
  index: number
  sumByPlayer: [number, number]
  winner: PlayerId | 'tie'
}

export interface ScoreResult {
  lines: LineResult[]
  linePoints: [number, number]
  totalValue: [number, number]
  winner: PlayerId | 'draw'
}
