import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  MAX_TURNS,
  applyAction,
  createInitialState,
  findWinningLine,
  getLargestGroupSize,
  indexOf,
  isProtected,
} from './engine'
import type { GameState } from './types'

function place(state: GameState, row: number, col: number) {
  const result = applyAction(state, { type: 'place', cell: indexOf(row, col, state.size) })
  expect(result.error).toBeNull()
  return result.state
}

function openingContinue(state: GameState) {
  // Bは「続行」を選ぶために、盤外にならない適当な空きマスへplaceする
  const cell = state.board.findIndex((c) => c === null)
  const result = applyAction(state, { type: 'place', cell })
  expect(result.error).toBeNull()
  return result.state
}

describe('createInitialState', () => {
  it('7x7の空盤面・両者フォージ3回でスタートする', () => {
    const state = createInitialState()
    expect(state.board).toHaveLength(BOARD_SIZE * BOARD_SIZE)
    expect(state.board.every((c) => c === null)).toBe(true)
    expect(state.forgeCharges).toEqual({ A: 3, B: 3 })
    expect(state.currentPlayer).toBe('A')
    expect(state.phase).toBe('opening-wait-swap')
  })
})

describe('配置ルール', () => {
  it('埋まっているマスへの配置は拒否される', () => {
    let state = createInitialState()
    state = place(state, 3, 3)
    state = openingContinue(state)
    const result = applyAction(state, { type: 'place', cell: indexOf(3, 3, state.size) })
    expect(result.error).not.toBeNull()
  })

  it('盤外のマスへの配置は拒否される', () => {
    const state = createInitialState()
    const result = applyAction(state, { type: 'place', cell: 999 })
    expect(result.error).not.toBeNull()
  })
})

describe('パイルール（開幕スワップ）', () => {
  it('Aの初手直後、Bはスワップして石の色を奪える', () => {
    let state = createInitialState()
    state = place(state, 3, 3)
    expect(state.phase).toBe('opening-wait-swap')
    const result = applyAction(state, { type: 'swap' })
    expect(result.error).toBeNull()
    state = result.state
    expect(state.board[indexOf(3, 3, state.size)]).toBe('B')
    expect(state.currentPlayer).toBe('A')
    expect(state.phase).toBe('playing')
  })

  it('Bが続行を選べば通常進行になる', () => {
    let state = createInitialState()
    state = place(state, 3, 3)
    state = openingContinue(state)
    expect(state.phase).toBe('playing')
    expect(state.currentPlayer).toBe('A')
  })

  it('開幕待ち中はフォージできない', () => {
    let state = createInitialState()
    state = place(state, 3, 3) // A
    // Bはまだswap待ち。もしplaceで続行してすぐにforgeしようとしても開幕直後はcharge>0だが対象がいないので別テストで確認
    const result = applyAction(state, { type: 'forge', target: indexOf(3, 3, state.size), cell: indexOf(0, 0, state.size) })
    expect(result.error).not.toBeNull()
  })
})

describe('勝利判定', () => {
  it('横方向に5連結で勝利する', () => {
    let state = createInitialState()
    state = place(state, 0, 0) // A
    state = openingContinue(state) // B continues at some cell
    // 手動でAだけが並ぶように直接盤面を検証する簡易シナリオ
    const board = [...state.board]
    // 盤面をリセットしてクリーンな検証用状態を作る
    const clean: GameState = { ...state, board: new Array(state.size * state.size).fill(null) }
    let s = clean
    // A: (1,0)(1,1)(1,2)(1,3) を用意し、最後に(1,4)を置いて勝利させる
    const seq: Array<[number, number]> = [
      [1, 0], // A
      [5, 0], // B (無関係マス)
      [1, 1], // A
      [5, 1], // B
      [1, 2], // A
      [5, 2], // B
      [1, 3], // A
      [5, 3], // B
    ]
    for (const [r, c] of seq) {
      const res = applyAction(s, { type: 'place', cell: indexOf(r, c, s.size) })
      expect(res.error).toBeNull()
      s = res.state
    }
    expect(s.winner).toBeNull()
    const finalRes = applyAction(s, { type: 'place', cell: indexOf(1, 4, s.size) })
    expect(finalRes.error).toBeNull()
    expect(finalRes.state.winner).toBe('A')
    expect(finalRes.state.phase).toBe('finished')
    expect(finalRes.state.winningLine).not.toBeNull()
    void board
  })
})

describe('フォージルール', () => {
  it('3連結以上のグループに属する石はフォージできない', () => {
    let state = createInitialState()
    const clean: GameState = { ...state, board: new Array(state.size * state.size).fill(null), phase: 'playing' }
    let s = clean
    // Bの石を3つ横に並べて保護グループにする
    const seq: Array<[number, number, 'A' | 'B']> = [
      [0, 0, 'A'],
      [3, 0, 'B'],
      [0, 1, 'A'],
      [3, 1, 'B'],
      [0, 2, 'A'],
      [3, 2, 'B'],
    ]
    const board = s.board.slice()
    for (const [r, c, p] of seq) board[indexOf(r, c, s.size)] = p
    s = { ...s, board, currentPlayer: 'A', forgeCharges: { A: 3, B: 3 } }
    expect(isProtected(s.board, s.size, indexOf(3, 1, s.size))).toBe(true)
    const result = applyAction(s, { type: 'forge', target: indexOf(3, 1, s.size), cell: indexOf(6, 6, s.size) })
    expect(result.error).not.toBeNull()
  })

  it('保護されていない石はフォージで奪って置き直せる', () => {
    let state = createInitialState()
    const clean: GameState = { ...state, board: new Array(state.size * state.size).fill(null), phase: 'playing' }
    let s = clean
    const board = s.board.slice()
    board[indexOf(3, 3, s.size)] = 'B'
    s = { ...s, board, currentPlayer: 'A', forgeCharges: { A: 3, B: 3 } }
    const result = applyAction(s, { type: 'forge', target: indexOf(3, 3, s.size), cell: indexOf(0, 0, s.size) })
    expect(result.error).toBeNull()
    expect(result.state.board[indexOf(3, 3, s.size)]).toBeNull()
    expect(result.state.board[indexOf(0, 0, s.size)]).toBe('A')
    expect(result.state.forgeCharges.A).toBe(2)
  })

  it('置かれたばかりの石は猶予期間中はフォージできない（QAラウンド1で発見した必勝バグの修正）', () => {
    let state = createInitialState()
    const clean: GameState = {
      ...state,
      board: new Array(state.size * state.size).fill(null),
      phase: 'playing',
      forgeCharges: { A: 3, B: 3 },
    }
    const board = clean.board.slice()
    board[indexOf(3, 3, clean.size)] = 'B'
    const placedOnTurn = clean.placedOnTurn.slice()
    placedOnTurn[indexOf(3, 3, clean.size)] = 5
    const s: GameState = { ...clean, board, placedOnTurn, currentPlayer: 'A', turnNumber: 6 } // 経過1ターン
    const result = applyAction(s, { type: 'forge', target: indexOf(3, 3, s.size), cell: indexOf(0, 0, s.size) })
    expect(result.error).not.toBeNull()
  })

  it('猶予期間(2ターン以上経過)を過ぎればフォージできる', () => {
    let state = createInitialState()
    const clean: GameState = {
      ...state,
      board: new Array(state.size * state.size).fill(null),
      phase: 'playing',
      forgeCharges: { A: 3, B: 3 },
    }
    const board = clean.board.slice()
    board[indexOf(3, 3, clean.size)] = 'B'
    const placedOnTurn = clean.placedOnTurn.slice()
    placedOnTurn[indexOf(3, 3, clean.size)] = 5
    const s: GameState = { ...clean, board, placedOnTurn, currentPlayer: 'A', turnNumber: 7 } // 経過2ターン
    const result = applyAction(s, { type: 'forge', target: indexOf(3, 3, s.size), cell: indexOf(0, 0, s.size) })
    expect(result.error).toBeNull()
  })

  it('フォージ権がなければフォージできない', () => {
    let state = createInitialState()
    const clean: GameState = {
      ...state,
      board: new Array(state.size * state.size).fill(null),
      phase: 'playing',
      forgeCharges: { A: 0, B: 3 },
    }
    const board = clean.board.slice()
    board[indexOf(3, 3, clean.size)] = 'B'
    const s = { ...clean, board }
    const result = applyAction(s, { type: 'forge', target: indexOf(3, 3, s.size), cell: indexOf(0, 0, s.size) })
    expect(result.error).not.toBeNull()
  })
})

describe('終了条件（有限性の保証）', () => {
  it('MAX_TURNSは49(配置上限)+6(フォージ合計上限)+1(開幕スワップ)=56である', () => {
    expect(MAX_TURNS).toBe(56)
  })
})

describe('連結グループ計算', () => {
  it('4方向隣接のみで連結を数える（斜めは別グループ）', () => {
    let state = createInitialState()
    const clean: GameState = { ...state, board: new Array(state.size * state.size).fill(null) }
    const board = clean.board.slice()
    board[indexOf(0, 0, clean.size)] = 'A'
    board[indexOf(1, 1, clean.size)] = 'A' // 斜め隣接のみ、非連結
    const s = { ...clean, board }
    expect(getLargestGroupSize(s.board, s.size, 'A')).toBe(1)
  })
})

describe('findWinningLine', () => {
  it('石が置かれていないマスではnullを返す', () => {
    const state = createInitialState()
    expect(findWinningLine(state.board, state.size, 0)).toBeNull()
  })
})
