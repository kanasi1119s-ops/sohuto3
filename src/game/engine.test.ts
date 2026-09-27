import { describe, expect, it } from 'vitest'
import { largestConnectedGroup } from './board'
import { applyPlacement, createGame, drawCard, legalPositions } from './engine'
import type { GameState } from './types'

function drawAndPlace(state: GameState, position: { row: number; col: number }): GameState {
  const drawn = drawCard(state)
  return applyPlacement(drawn, position)
}

describe('createGame', () => {
  it('creates an empty board with a full deck and P1 to move', () => {
    const g = createGame(42)
    expect(g.board.length).toBe(7)
    expect(g.board[0].length).toBe(7)
    expect(g.drawPile.length).toBe(20)
    expect(g.currentPlayer).toBe('P1')
    expect(g.status).toBe('PLAYING')
  })

  it('is deterministic for a fixed seed', () => {
    const a = createGame(1234)
    const b = createGame(1234)
    expect(a.drawPile).toEqual(b.drawPile)
  })
})

describe('drawCard', () => {
  it('moves one card out of the draw pile and does not touch the board', () => {
    const g = createGame(1)
    const drawn = drawCard(g)
    expect(drawn.drawPile.length).toBe(g.drawPile.length - 1)
    expect(drawn.lastDrawnCard).not.toBeNull()
    expect(drawn.board).toEqual(g.board)
  })

  it('reshuffles the discard pile into a fresh draw pile once exhausted', () => {
    let g = createGame(7)
    // Exhaust the entire draw pile (20 cards) by drawing+placing repeatedly.
    for (let i = 0; i < 20; i++) {
      const drawn = drawCard(g)
      const legal = legalPositions(drawn)
      g = applyPlacement(drawn, legal[0])
    }
    expect(g.drawPile.length).toBe(0)
    expect(g.discardPile.length).toBe(20)

    const drawn = drawCard(g)
    expect(drawn.drawPile.length).toBe(19)
    expect(drawn.discardPile.length).toBe(0)
  })
})

describe('legalPositions', () => {
  it('PLACE with no stones yet allows any empty cell', () => {
    const g = drawCard(createGame(5))
    // force scenario regardless of actual drawn card type by checking JUMP/BLOCK too
    const legal = legalPositions(g)
    expect(legal.length).toBe(48) // 49 cells minus the pre-blocked center
  })

  it('PLACE only allows cells orthogonally adjacent to own stones once player has a stone', () => {
    let g = createGame(9)
    // Turn 1: P1 places at (2,2) regardless of card (first placement is always free).
    g = drawAndPlace(g, { row: 2, col: 2 })
    // Turn 2: P2 places somewhere, e.g. (0,0)
    let g2 = drawCard(g)
    const p2Legal = legalPositions(g2)
    g2 = applyPlacement(g2, p2Legal[0])

    // Turn 3: P1 draws again; if it's a PLACE (non-fallback), legal cells must all be adjacent to (2,2).
    const g3 = drawCard(g2)
    if (g3.lastDrawnCard!.type === 'PLACE' && !g3.lastDrawnCard!.fallback) {
      const legal = legalPositions(g3)
      for (const pos of legal) {
        const dr = Math.abs(pos.row - 2)
        const dc = Math.abs(pos.col - 2)
        expect(dr + dc).toBe(1)
      }
    }
  })

  it('JUMP and BLOCK always allow any empty cell', () => {
    let g = createGame(3)
    g = drawAndPlace(g, { row: 0, col: 0 })
    let found = { jump: false, block: false }
    let state = g
    for (let i = 0; i < 30 && !(found.jump && found.block); i++) {
      const drawn = drawCard(state)
      const legal = legalPositions(drawn)
      const emptyCount = drawn.board.flat().filter((c) => c === null).length
      if (drawn.lastDrawnCard!.type === 'JUMP') {
        found.jump = true
        expect(legal.length).toBe(emptyCount)
      }
      if (drawn.lastDrawnCard!.type === 'BLOCK') {
        found.block = true
        expect(legal.length).toBe(emptyCount)
      }
      state = applyPlacement(drawn, legal[0])
    }
  })
})

describe('applyPlacement', () => {
  it('rejects placement on a non-empty cell', () => {
    let g = createGame(2)
    g = drawAndPlace(g, { row: 0, col: 0 })
    const drawn = drawCard(g)
    expect(() => applyPlacement(drawn, { row: 0, col: 0 })).toThrow()
  })

  it('rejects illegal placement for the drawn card', () => {
    let g = createGame(11)
    g = drawAndPlace(g, { row: 2, col: 2 })
    let g2 = drawCard(g)
    g2 = applyPlacement(g2, legalPositions(g2)[0])
    const g3 = drawCard(g2)
    if (g3.lastDrawnCard!.type === 'PLACE' && !g3.lastDrawnCard!.fallback) {
      // far corner is not adjacent to (2,2) -> illegal
      expect(() => applyPlacement(g3, { row: 6, col: 6 })).toThrow()
    }
  })

  it('BLOCK places a neutral stone that does not belong to either player', () => {
    let g = createGame(3)
    let state = g
    for (let i = 0; i < 30; i++) {
      const drawn = drawCard(state)
      if (drawn.lastDrawnCard!.type === 'BLOCK') {
        const legal = legalPositions(drawn)
        const pos = legal[0]
        const placed = applyPlacement(drawn, pos)
        expect(placed.board[pos.row][pos.col]).toBe('BLOCK')
        return
      }
      state = applyPlacement(drawn, legalPositions(drawn)[0])
    }
    throw new Error('BLOCK card never drawn in 30 turns (seed dependent, re-check seed).')
  })

  it('falls back to free placement when PLACE has no adjacent empty cell', () => {
    // Synthetic 3x3 board: P1 owns the center, completely walled in by BLOCK on all
    // four orthogonal sides, so a PLACE draw must fall back to free placement.
    const config = { boardSize: 3, deckComposition: { PLACE: 1, JUMP: 0, BLOCK: 0 } }
    const board = [
      [null, 'BLOCK', null],
      ['BLOCK', 'P1', 'BLOCK'],
      [null, 'BLOCK', null],
    ] as any
    const state: GameState = {
      config,
      board,
      drawPile: ['PLACE'],
      discardPile: [],
      currentPlayer: 'P1',
      turnNumber: 1,
      lastDrawnCard: null,
      lastPlacedAt: null,
      history: [],
      status: 'PLAYING',
      result: null,
      rngState: 1,
    }

    const drawn = drawCard(state)
    expect(drawn.lastDrawnCard).toEqual({ type: 'PLACE', fallback: true })

    const legal = legalPositions(drawn)
    // The 4 empty corners should all be legal since adjacency is waived.
    expect(legal.length).toBe(4)
  })
})

describe('largestConnectedGroup', () => {
  it('computes the largest orthogonally connected group correctly', () => {
    const config = { boardSize: 3, deckComposition: { PLACE: 1, JUMP: 0, BLOCK: 0 } }
    const board = [
      ['P1', 'P1', null],
      [null, 'P1', null],
      ['P2', null, 'P1'],
    ] as any
    expect(largestConnectedGroup(config, board, 'P1')).toBe(3) // (0,0)-(0,1)-(1,1) connected; (2,2) isolated
    expect(largestConnectedGroup(config, board, 'P2')).toBe(1)
  })
})

describe('full game termination', () => {
  it('always finishes within boardSize*boardSize turns and produces a result', () => {
    for (const seed of [1, 2, 3, 42, 999]) {
      let g = createGame(seed)
      let turns = 0
      while (g.status === 'PLAYING' && turns < 100) {
        const drawn = drawCard(g)
        const legal = legalPositions(drawn)
        expect(legal.length).toBeGreaterThan(0)
        g = applyPlacement(drawn, legal[0])
        turns++
      }
      expect(g.status).toBe('FINISHED')
      expect(turns).toBe(48) // center cell is pre-blocked, so exactly 48 playable cells

      expect(g.result).not.toBeNull()
      expect(['P1', 'P2', 'DRAW']).toContain(g.result!.winner)
    }
  })
})
