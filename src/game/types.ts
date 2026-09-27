export type Player = 'A' | 'B'

export type Cell = Player | null

export interface ActionPlace {
  type: 'place'
  cell: number
}

export interface ActionForge {
  type: 'forge'
  target: number
  cell: number
}

export interface ActionSwap {
  type: 'swap'
}

export type Action = ActionPlace | ActionForge | ActionSwap

export type Phase = 'opening-wait-swap' | 'playing' | 'finished'

export interface GameState {
  readonly size: number
  readonly board: readonly Cell[]
  /** 各マスの石が置かれた時点の turnNumber（空マスや不明な場合は null）。フォージの猶予期間判定に使う */
  readonly placedOnTurn: readonly (number | null)[]
  readonly currentPlayer: Player
  readonly forgeCharges: Readonly<Record<Player, number>>
  readonly turnNumber: number
  readonly phase: Phase
  readonly winner: Player | 'draw' | null
  readonly winningLine: readonly number[] | null
  readonly lastAction: Action | null
  readonly history: readonly Action[]
}

export interface ApplyResult {
  state: GameState
  error: string | null
}
