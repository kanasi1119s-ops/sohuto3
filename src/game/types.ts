export type Res = 'fish' | 'veg' | 'rice'
export type SpaceId =
  | 'fish'
  | 'veg'
  | 'rice'
  | 'assort'
  | 'order'
  | 'deliver1'
  | 'deliver2'
  | 'rooster'
export type PlayerIndex = 0 | 1

export interface Order {
  id: string
  name: string
  cat: Res
  cost: Record<Res, number>
  points: number
}

export interface Player {
  res: Record<Res, number>
  hand: Order[]
  done: Order[]
}

export interface GameState {
  round: number // 1..ROUNDS
  turnInRound: number // 0..5
  first: PlayerIndex
  current: PlayerIndex
  players: [Player, Player]
  spaces: Record<SpaceId, PlayerIndex | null>
  roosterTaker: PlayerIndex | null
  deck: Order[]
  market: Order[]
  rng: number
  over: boolean
  log: string[]
}

export type Action =
  | { type: 'place'; space: SpaceId; orderId?: string; res?: Res }
  | { type: 'pass' }

export interface ScoreBreakdown {
  orders: number
  allCats: number
  triple: number
  penalty: number
  total: number
}
