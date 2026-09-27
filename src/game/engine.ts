import type { Action, ApplyResult, Cell, GameState, Player } from './types'

export const BOARD_SIZE = 7
export const WIN_LENGTH = 5
export const INITIAL_FORGE_CHARGES = 3
export const PROTECTED_GROUP_SIZE = 3
// 49(全マスを埋める配置)+6(フォージ合計上限)+1(開幕スワップは配置を伴わない特殊な1手) = 56
export const MAX_TURNS = BOARD_SIZE * BOARD_SIZE + INITIAL_FORGE_CHARGES * 2 + 1
/**
 * フォージの猶予期間（ターン数）。置かれてから経過ターン数がこれ未満の石はフォージ対象にできない。
 * QAで「開いた三を単独の石でブロックしても、相手がその場でフォージして即座に取り消せてしまう」
 * という致命的な必勝パターンが見つかったため導入した（docs/debug-log.md ラウンド1参照）。
 */
export const FORGE_MIN_AGE = 2

export function otherPlayer(p: Player): Player {
  return p === 'A' ? 'B' : 'A'
}

export function rowColOf(index: number, size = BOARD_SIZE): [number, number] {
  return [Math.floor(index / size), index % size]
}

export function indexOf(row: number, col: number, size = BOARD_SIZE): number {
  return row * size + col
}

export function inBounds(row: number, col: number, size = BOARD_SIZE): boolean {
  return row >= 0 && row < size && col >= 0 && col < size
}

export function createInitialState(): GameState {
  return {
    size: BOARD_SIZE,
    board: new Array(BOARD_SIZE * BOARD_SIZE).fill(null) as Cell[],
    placedOnTurn: new Array(BOARD_SIZE * BOARD_SIZE).fill(null) as (number | null)[],
    currentPlayer: 'A',
    forgeCharges: { A: INITIAL_FORGE_CHARGES, B: INITIAL_FORGE_CHARGES },
    turnNumber: 1,
    phase: 'opening-wait-swap',
    winner: null,
    winningLine: null,
    lastAction: null,
    history: [],
  }
}

/** 4方向隣接（上下左右）で同色連結しているグループを取得する */
export function getConnectedGroup(board: readonly Cell[], size: number, start: number): number[] {
  const color = board[start]
  if (!color) return []
  const visited = new Set<number>([start])
  const stack = [start]
  const group: number[] = []
  while (stack.length > 0) {
    const cur = stack.pop() as number
    group.push(cur)
    const [row, col] = rowColOf(cur, size)
    const neighbors = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ]
    for (const [r, c] of neighbors) {
      if (!inBounds(r, c, size)) continue
      const idx = indexOf(r, c, size)
      if (visited.has(idx)) continue
      if (board[idx] === color) {
        visited.add(idx)
        stack.push(idx)
      }
    }
  }
  return group
}

export function getAllGroupsForPlayer(board: readonly Cell[], size: number, player: Player): number[][] {
  const seen = new Set<number>()
  const groups: number[][] = []
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== player || seen.has(i)) continue
    const group = getConnectedGroup(board, size, i)
    group.forEach((idx) => seen.add(idx))
    groups.push(group)
  }
  return groups
}

export function getLargestGroupSize(board: readonly Cell[], size: number, player: Player): number {
  const groups = getAllGroupsForPlayer(board, size, player)
  return groups.reduce((max, g) => Math.max(max, g.length), 0)
}

/** 石を置いた直後、その石を含む5連結（縦横斜め）があるか判定する */
export function findWinningLine(board: readonly Cell[], size: number, lastIndex: number): number[] | null {
  const color = board[lastIndex]
  if (!color) return null
  const [row, col] = rowColOf(lastIndex, size)
  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (const [dr, dc] of directions) {
    const line: number[] = [lastIndex]
    // 正方向
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c, size) && board[indexOf(r, c, size)] === color) {
      line.push(indexOf(r, c, size))
      r += dr
      c += dc
    }
    // 逆方向
    r = row - dr
    c = col - dc
    while (inBounds(r, c, size) && board[indexOf(r, c, size)] === color) {
      line.push(indexOf(r, c, size))
      r -= dr
      c -= dc
    }
    if (line.length >= WIN_LENGTH) return line
  }
  return null
}

/** cell に color の石を実際には置かずに、置いたと仮定した場合に5連結が成立するかを判定する */
export function wouldWinAt(board: readonly Cell[], size: number, cell: number, color: Player): boolean {
  const [row, col] = rowColOf(cell, size)
  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (const [dr, dc] of directions) {
    let count = 1
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c, size) && board[indexOf(r, c, size)] === color) {
      count++
      r += dr
      c += dc
    }
    r = row - dr
    c = col - dc
    while (inBounds(r, c, size) && board[indexOf(r, c, size)] === color) {
      count++
      r -= dr
      c -= dc
    }
    if (count >= WIN_LENGTH) return true
  }
  return false
}

/**
 * mover が次の一手（配置、または保護されていない相手の石をフォージして配置）で
 * 即座に5連結を作れる状況かどうかを判定する。AIの「自殺手」回避に使う。
 */
export function canWinImmediately(board: readonly Cell[], size: number, mover: Player, moverForgeCharges: number): boolean {
  const emptyCells = getEmptyCells(board)
  for (const cell of emptyCells) {
    if (wouldWinAt(board, size, cell, mover)) return true
  }
  if (moverForgeCharges > 0) {
    const opponent = otherPlayer(mover)
    for (let target = 0; target < board.length; target++) {
      if (board[target] !== opponent) continue
      if (isProtected(board, size, target)) continue
      const simBoard = board.slice()
      simBoard[target] = null
      const simEmpty = getEmptyCells(simBoard)
      for (const cell of simEmpty) {
        if (wouldWinAt(simBoard, size, cell, mover)) return true
      }
    }
  }
  return false
}

const LINE_DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

/**
 * color の石が「両端とも空きマス」の4連結（オープンフォー）を持っているかを判定する。
 * オープンフォーは次の一手でどちらの端を塞いでも反対側で5連結が完成するため、実質的に阻止不可能な勝ち確定形である。
 */
export function hasOpenFour(board: readonly Cell[], size: number, color: Player): boolean {
  for (let start = 0; start < board.length; start++) {
    if (board[start] !== color) continue
    const [row, col] = rowColOf(start, size)
    for (const [dr, dc] of LINE_DIRECTIONS) {
      const pr = row - dr
      const pc = col - dc
      // start がこの方向の連結の先頭でなければ、その連結は別の start で既に数えているのでスキップ
      if (inBounds(pr, pc, size) && board[indexOf(pr, pc, size)] === color) continue
      let length = 0
      let r = row
      let c = col
      while (inBounds(r, c, size) && board[indexOf(r, c, size)] === color) {
        length++
        r += dr
        c += dc
      }
      if (length >= 4) {
        const beforeEmpty = inBounds(pr, pc, size) && board[indexOf(pr, pc, size)] === null
        const afterEmpty = inBounds(r, c, size) && board[indexOf(r, c, size)] === null
        if (beforeEmpty && afterEmpty) return true
      }
    }
  }
  return false
}

/**
 * mover が次の一手で「即勝ち」または「阻止不可能なオープンフォー」を作れるかどうかを判定する。
 * canWinImmediately よりも一歩踏み込み、1手先に相手が防げない必勝形を作られる手を検出するために使う。
 */
export function canForceWinNextMove(board: readonly Cell[], size: number, mover: Player, moverForgeCharges: number): boolean {
  if (canWinImmediately(board, size, mover, moverForgeCharges)) return true

  for (const cell of getEmptyCells(board)) {
    const b = board.slice()
    b[cell] = mover
    if (hasOpenFour(b, size, mover)) return true
  }

  if (moverForgeCharges > 0) {
    const opponent = otherPlayer(mover)
    for (let target = 0; target < board.length; target++) {
      if (board[target] !== opponent) continue
      if (isProtected(board, size, target)) continue
      const simBoard = board.slice()
      simBoard[target] = null
      for (const cell of getEmptyCells(simBoard)) {
        const b = simBoard.slice()
        b[cell] = mover
        if (hasOpenFour(b, size, mover)) return true
      }
    }
  }
  return false
}

/** そのマスの石が「3連結以上」のグループに属していて除去(フォージ)から保護されているか */
export function isProtected(board: readonly Cell[], size: number, index: number): boolean {
  if (!board[index]) return false
  return getConnectedGroup(board, size, index).length >= PROTECTED_GROUP_SIZE
}

export function isBoardFull(board: readonly Cell[]): boolean {
  return board.every((c) => c !== null)
}

export function getEmptyCells(board: readonly Cell[]): number[] {
  const cells: number[] = []
  board.forEach((c, i) => {
    if (c === null) cells.push(i)
  })
  return cells
}

/**
 * 石が置かれてから経過したターン数。placedOnTurn が記録されていない（テスト等での手動構築盤面）場合は
 * 古い石として扱い、猶予期間の対象外（Infinity）とする。
 */
export function stoneAge(state: GameState, index: number): number {
  const placedTurn = state.placedOnTurn[index]
  if (placedTurn === null || placedTurn === undefined) return Infinity
  return state.turnNumber - placedTurn
}

export function getForgeableTargets(state: GameState): number[] {
  const opponent = otherPlayer(state.currentPlayer)
  const targets: number[] = []
  state.board.forEach((c, i) => {
    if (c !== opponent) return
    if (isProtected(state.board, state.size, i)) return
    if (stoneAge(state, i) < FORGE_MIN_AGE) return
    targets.push(i)
  })
  return targets
}

export function canForge(state: GameState): boolean {
  return state.forgeCharges[state.currentPlayer] > 0 && getForgeableTargets(state).length > 0
}

function resolveEndgame(board: readonly Cell[], size: number): Player | 'draw' {
  const largestA = getLargestGroupSize(board, size, 'A')
  const largestB = getLargestGroupSize(board, size, 'B')
  if (largestA !== largestB) return largestA > largestB ? 'A' : 'B'
  const countA = board.filter((c) => c === 'A').length
  const countB = board.filter((c) => c === 'B').length
  if (countA !== countB) return countA > countB ? 'A' : 'B'
  return 'draw'
}

function withError(state: GameState, error: string): ApplyResult {
  return { state, error }
}

export function applyAction(state: GameState, action: Action): ApplyResult {
  if (state.phase === 'finished') {
    return withError(state, 'ゲームは既に終了しています')
  }

  if (action.type === 'swap') {
    if (state.phase !== 'opening-wait-swap') {
      return withError(state, '今はスワップを選択できません')
    }
    const board = state.board.slice()
    const placedIndex = board.findIndex((c) => c !== null)
    if (placedIndex === -1) return withError(state, 'スワップ対象の石がありません')
    board[placedIndex] = 'B'
    const next: GameState = {
      ...state,
      board,
      phase: 'playing',
      currentPlayer: 'A',
      turnNumber: state.turnNumber + 1,
      lastAction: action,
      history: [...state.history, action],
    }
    return { state: next, error: null }
  }

  if (state.phase === 'opening-wait-swap') {
    // 開幕直後、Bはswapかplace(続行)以外の操作はできない
    if (action.type !== 'place') {
      return withError(state, '開幕直後はフォージを使用できません')
    }
  }

  if (action.type === 'place') {
    if (action.cell < 0 || action.cell >= state.board.length) {
      return withError(state, '盤外のマスです')
    }
    if (state.board[action.cell] !== null) {
      return withError(state, 'そのマスは既に埋まっています')
    }
    const board = state.board.slice()
    board[action.cell] = state.currentPlayer
    const placedOnTurn = state.placedOnTurn.slice()
    placedOnTurn[action.cell] = state.turnNumber
    // Aの開幕1手目の直後はBのスワップ判断待ちにするため opening-wait-swap を維持する
    const keepOpeningWait = state.phase === 'opening-wait-swap' && state.currentPlayer === 'A'
    return finalizeTurn({ ...state, placedOnTurn }, board, action, keepOpeningWait)
  }

  if (action.type === 'forge') {
    if (state.phase === 'opening-wait-swap') {
      return withError(state, '開幕直後はフォージを使用できません')
    }
    if (state.forgeCharges[state.currentPlayer] <= 0) {
      return withError(state, 'フォージ権が残っていません')
    }
    const opponent = otherPlayer(state.currentPlayer)
    if (state.board[action.target] !== opponent) {
      return withError(state, 'フォージ対象は相手の石である必要があります')
    }
    if (isProtected(state.board, state.size, action.target)) {
      return withError(state, 'その石は3連結以上のグループに属しており保護されています')
    }
    const age = stoneAge(state, action.target)
    if (age < FORGE_MIN_AGE) {
      return withError(state, `その石は置かれたばかりで、あと${FORGE_MIN_AGE - age}ターンはフォージできません`)
    }
    if (action.cell < 0 || action.cell >= state.board.length) {
      return withError(state, '盤外のマスです')
    }
    const board = state.board.slice()
    board[action.target] = null
    if (board[action.cell] !== null) {
      return withError(state, '配置先のマスは既に埋まっています')
    }
    board[action.cell] = state.currentPlayer
    const placedOnTurn = state.placedOnTurn.slice()
    placedOnTurn[action.target] = null
    placedOnTurn[action.cell] = state.turnNumber
    const forgeCharges = {
      ...state.forgeCharges,
      [state.currentPlayer]: state.forgeCharges[state.currentPlayer] - 1,
    }
    return finalizeTurn({ ...state, forgeCharges, placedOnTurn }, board, action)
  }

  return withError(state, '不明なアクションです')
}

function finalizeTurn(state: GameState, board: Cell[], action: Action, keepOpeningWait = false): ApplyResult {
  const placedIndex = action.type === 'place' ? action.cell : action.type === 'forge' ? action.cell : -1
  const winningLine = placedIndex >= 0 ? findWinningLine(board, state.size, placedIndex) : null
  const winnerColor = winningLine ? board[placedIndex] : null

  let phase: GameState['phase'] = keepOpeningWait ? 'opening-wait-swap' : 'playing'
  let winner: GameState['winner'] = null
  let finalWinningLine: number[] | null = null

  if (winnerColor) {
    phase = 'finished'
    winner = winnerColor
    finalWinningLine = winningLine
  } else if (isBoardFull(board)) {
    phase = 'finished'
    winner = resolveEndgame(board, state.size)
  }

  const next: GameState = {
    ...state,
    board,
    phase,
    winner,
    winningLine: finalWinningLine,
    currentPlayer: otherPlayer(state.currentPlayer),
    turnNumber: state.turnNumber + 1,
    lastAction: action,
    history: [...state.history, action],
  }
  return { state: next, error: null }
}
