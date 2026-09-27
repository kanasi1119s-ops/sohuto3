import type { Difficulty } from './game/ai'
import type { Player } from './game/types'

export interface GameConfig {
  mode: 'hotseat' | 'vs-ai'
  humanPlayer: Player
  aiDifficulty: Difficulty
}

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'vs-ai',
  humanPlayer: 'A',
  aiDifficulty: 'greedy',
}
