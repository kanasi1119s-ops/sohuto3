import { describe, expect, it } from 'vitest'
import { applyMove, computeScore, createInitialState, getValidMoves, isTerminal, isValidMove } from './engine'
import { randomAI, greedyAI } from './ai'
import { mulberry32 } from './rng'
import { CELL_COUNT, MARKET_SIZE, TILES_PER_PLAYER } from './types'

describe('createInitialState', () => {
  it('deals a full 16-tile deck split into a 3-tile market and 13-tile deck', () => {
    const state = createInitialState(1)
    expect(state.market).toHaveLength(MARKET_SIZE)
    expect(state.deck).toHaveLength(16 - MARKET_SIZE)
    expect(state.board).toHaveLength(CELL_COUNT)
    expect(state.board.every((c) => c === null)).toBe(true)
    expect(state.currentPlayer).toBe(0)
  })

  it('is deterministic for a given seed', () => {
    const a = createInitialState(42)
    const b = createInitialState(42)
    expect(a.market.map((t) => t.value)).toEqual(b.market.map((t) => t.value))
    expect(a.deck.map((t) => t.value)).toEqual(b.deck.map((t) => t.value))
  })
})

describe('applyMove', () => {
  it('rejects a tile not currently in the market', () => {
    const state = createInitialState(1)
    expect(isValidMove(state, { tileId: 9999, cellIndex: 0 })).toBe(false)
    expect(() => applyMove(state, { tileId: 9999, cellIndex: 0 })).toThrow()
  })

  it('rejects placement on an occupied cell', () => {
    let state = createInitialState(1)
    const move = getValidMoves(state)[0]
    state = applyMove(state, move)
    const sameCellMove = { tileId: state.market[0].id, cellIndex: move.cellIndex }
    expect(isValidMove(state, sameCellMove)).toBe(false)
  })

  it('does not mutate the input state (immutability)', () => {
    const state = createInitialState(1)
    const snapshot = JSON.stringify(state)
    const move = getValidMoves(state)[0]
    applyMove(state, move)
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('refills the market from the deck and alternates the current player', () => {
    let state = createInitialState(1)
    const move = getValidMoves(state)[0]
    const next = applyMove(state, move)
    expect(next.market).toHaveLength(MARKET_SIZE)
    expect(next.currentPlayer).toBe(1)
    expect(next.placedCount[0]).toBe(1)
    expect(next.deck).toHaveLength(state.deck.length - 1)
  })

  it('shrinks the market once the deck is exhausted instead of erroring', () => {
    let state = createInitialState(7)
    // Play until the deck runs dry; market should shrink below MARKET_SIZE near the end.
    while (state.deck.length > 0) {
      const move = getValidMoves(state)[0]
      state = applyMove(state, move)
    }
    expect(state.deck).toHaveLength(0)
    expect(state.market.length).toBeLessThanOrEqual(MARKET_SIZE)
    // Keep playing to the very end without throwing.
    while (!isTerminal(state)) {
      const move = getValidMoves(state)[0]
      state = applyMove(state, move)
    }
    expect(isTerminal(state)).toBe(true)
  })
})

describe('game length is fixed and finite', () => {
  it('always ends after exactly CELL_COUNT moves with TILES_PER_PLAYER each', () => {
    let state = createInitialState(123)
    let moves = 0
    const rng = mulberry32(999)
    while (!isTerminal(state)) {
      const move = randomAI(state, rng)
      state = applyMove(state, move)
      moves++
      expect(moves).toBeLessThanOrEqual(CELL_COUNT) // guards against any infinite loop
    }
    expect(moves).toBe(CELL_COUNT)
    expect(state.placedCount[0]).toBe(TILES_PER_PLAYER)
    expect(state.placedCount[1]).toBe(TILES_PER_PLAYER)
    expect(getValidMoves(state)).toHaveLength(0)
  })
})

describe('computeScore', () => {
  it('awards a line to whoever has the higher sum, and no point on a tie', () => {
    let state = createInitialState(5)
    // Manually build a deterministic tiny scenario using the engine's own move application
    // by playing a full random game and then re-deriving the score from raw board data.
    const rng = mulberry32(1)
    while (!isTerminal(state)) {
      state = applyMove(state, randomAI(state, rng))
    }
    const result = computeScore(state)
    expect(result.lines).toHaveLength(10)
    for (const line of result.lines) {
      const [a, b] = line.sumByPlayer
      if (a === b) expect(line.winner).toBe('tie')
      else expect(line.winner).toBe(a > b ? 0 : 1)
    }
    const totalPoints = result.linePoints[0] + result.linePoints[1]
    const tiedLines = result.lines.filter((l) => l.winner === 'tie').length
    expect(totalPoints + tiedLines).toBe(10)
  })

  it('total value across both players always equals the sum of all tile values (1..4 x4 each = 40)', () => {
    let state = createInitialState(2)
    const rng = mulberry32(2)
    while (!isTerminal(state)) {
      state = applyMove(state, randomAI(state, rng))
    }
    const result = computeScore(state)
    expect(result.totalValue[0] + result.totalValue[1]).toBe(40)
  })

  it('falls back to total-value tiebreak, and to a draw if that also ties', () => {
    // Construct a fully tied board by hand: every line sum equal between players.
    const state = createInitialState(1)
    const board = state.board.slice()
    // Checkerboard-style ownership with mirrored values produces equal sums on every line
    // for this particular 4x4 value layout.
    const values = [
      [1, 2, 3, 4],
      [4, 3, 2, 1],
      [2, 1, 4, 3],
      [3, 4, 1, 2],
    ]
    let id = 0
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const owner = (r + c) % 2 as 0 | 1
        board[r * 4 + c] = { id: id++, value: values[r][c] as 1 | 2 | 3 | 4, owner }
      }
    }
    const finished = { ...state, board }
    const result = computeScore(finished)
    expect(result.winner).toBe('draw')
    expect(result.linePoints[0]).toBe(result.linePoints[1])
    expect(result.totalValue[0]).toBe(result.totalValue[1])
  })
})

describe('AI strategies never produce illegal moves', () => {
  it('greedyAI only returns legal moves for 50 random games', () => {
    const rng = mulberry32(55)
    for (let g = 0; g < 50; g++) {
      let state = createInitialState(g)
      while (!isTerminal(state)) {
        const move = greedyAI(state, rng)
        expect(isValidMove(state, move)).toBe(true)
        state = applyMove(state, move)
      }
    }
  })
})
