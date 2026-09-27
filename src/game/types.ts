export type PlayerId = 'P1' | 'P2'

export type CellOwner = PlayerId | 'BLOCK' | null

export type CardType = 'PLACE' | 'JUMP' | 'BLOCK'

export interface Position {
  row: number
  col: number
}

export interface GameConfig {
  boardSize: number
  deckComposition: Record<CardType, number>
}

export interface DrawnCard {
  type: CardType
  /** true when a PLACE card had no legal adjacent cell and fell back to free placement */
  fallback?: boolean
}

export interface GameState {
  config: GameConfig
  board: CellOwner[][]
  drawPile: CardType[]
  discardPile: CardType[]
  currentPlayer: PlayerId
  turnNumber: number
  lastDrawnCard: DrawnCard | null
  lastPlacedAt: Position | null
  history: HistoryEntry[]
  status: 'PLAYING' | 'FINISHED'
  result: GameResult | null
  rngState: number
}

export interface HistoryEntry {
  turnNumber: number
  player: PlayerId
  card: DrawnCard
  position: Position
}

export interface GameResult {
  winner: PlayerId | 'DRAW'
  scores: Record<PlayerId, { maxGroup: number; totalStones: number }>
}

export const DEFAULT_CONFIG: GameConfig = {
  boardSize: 7,
  deckComposition: { PLACE: 12, JUMP: 4, BLOCK: 4 },
}
