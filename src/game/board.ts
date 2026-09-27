import type { CellOwner, GameConfig, PlayerId, Position } from './types'

export function createEmptyBoard(size: number): CellOwner[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null as CellOwner))
}

export function inBounds(config: GameConfig, pos: Position): boolean {
  return pos.row >= 0 && pos.row < config.boardSize && pos.col >= 0 && pos.col < config.boardSize
}

const ORTHOGONAL_DELTAS: Position[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

export function orthogonalNeighbors(config: GameConfig, pos: Position): Position[] {
  return ORTHOGONAL_DELTAS.map((d) => ({ row: pos.row + d.row, col: pos.col + d.col })).filter((p) =>
    inBounds(config, p),
  )
}

export function isEmpty(board: CellOwner[][], pos: Position): boolean {
  return board[pos.row][pos.col] === null
}

export function emptyCells(config: GameConfig, board: CellOwner[][]): Position[] {
  const cells: Position[] = []
  for (let row = 0; row < config.boardSize; row++) {
    for (let col = 0; col < config.boardSize; col++) {
      if (board[row][col] === null) cells.push({ row, col })
    }
  }
  return cells
}

export function isBoardFull(config: GameConfig, board: CellOwner[][]): boolean {
  for (let row = 0; row < config.boardSize; row++) {
    for (let col = 0; col < config.boardSize; col++) {
      if (board[row][col] === null) return false
    }
  }
  return true
}

/** Cells adjacent (orthogonally) to at least one of the player's own stones, that are currently empty. */
export function adjacentEmptyCellsToPlayer(
  config: GameConfig,
  board: CellOwner[][],
  player: PlayerId,
): Position[] {
  const seen = new Set<string>()
  const result: Position[] = []
  for (let row = 0; row < config.boardSize; row++) {
    for (let col = 0; col < config.boardSize; col++) {
      if (board[row][col] !== player) continue
      for (const n of orthogonalNeighbors(config, { row, col })) {
        if (board[n.row][n.col] === null) {
          const key = `${n.row},${n.col}`
          if (!seen.has(key)) {
            seen.add(key)
            result.push(n)
          }
        }
      }
    }
  }
  return result
}

export function playerHasStones(board: CellOwner[][], player: PlayerId): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell === player) return true
    }
  }
  return false
}

export function totalStones(board: CellOwner[][], player: PlayerId): number {
  let count = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell === player) count++
    }
  }
  return count
}

/** Largest orthogonally-connected group of a given owner's stones, via flood fill. */
export function largestConnectedGroup(config: GameConfig, board: CellOwner[][], owner: PlayerId): number {
  const visited = Array.from({ length: config.boardSize }, () => new Array(config.boardSize).fill(false))
  let best = 0
  for (let row = 0; row < config.boardSize; row++) {
    for (let col = 0; col < config.boardSize; col++) {
      if (board[row][col] !== owner || visited[row][col]) continue
      // BFS flood fill
      let size = 0
      const queue: Position[] = [{ row, col }]
      visited[row][col] = true
      while (queue.length > 0) {
        const cur = queue.pop()!
        size++
        for (const n of orthogonalNeighbors(config, cur)) {
          if (board[n.row][n.col] === owner && !visited[n.row][n.col]) {
            visited[n.row][n.col] = true
            queue.push(n)
          }
        }
      }
      if (size > best) best = size
    }
  }
  return best
}
