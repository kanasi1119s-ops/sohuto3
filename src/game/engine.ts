import {
  adjacentEmptyCellsToPlayer,
  createEmptyBoard,
  emptyCells,
  isBoardFull,
  isEmpty,
  largestConnectedGroup,
  playerHasStones,
  totalStones,
} from './board'
import { shuffle } from './rng'
import type { CardType, DrawnCard, GameConfig, GameResult, GameState, PlayerId, Position } from './types'
import { DEFAULT_CONFIG } from './types'

function buildDeck(config: GameConfig): CardType[] {
  const deck: CardType[] = []
  for (const [type, count] of Object.entries(config.deckComposition) as [CardType, number][]) {
    for (let i = 0; i < count; i++) deck.push(type)
  }
  return deck
}

/**
 * Pre-blocks the center cell (for odd board sizes) so the number of playable cells is even.
 * Without this, 49 cells split 25/24 between P1/P2, handing the first player a structural
 * extra placement every game (confirmed via simulation: see docs/debug-log.md Round 1).
 */
function applyCenterHandicap(board: ReturnType<typeof createEmptyBoard>, size: number): void {
  if (size % 2 === 1) {
    const center = Math.floor(size / 2)
    board[center][center] = 'BLOCK'
  }
}

export function createGame(seed: number, config: GameConfig = DEFAULT_CONFIG): GameState {
  const deck = buildDeck(config)
  const { shuffled, nextSeed } = shuffle(deck, seed)
  const board = createEmptyBoard(config.boardSize)
  applyCenterHandicap(board, config.boardSize)
  return {
    config,
    board,
    drawPile: shuffled,
    discardPile: [],
    currentPlayer: 'P1',
    turnNumber: 1,
    lastDrawnCard: null,
    lastPlacedAt: null,
    history: [],
    status: 'PLAYING',
    result: null,
    rngState: nextSeed,
  }
}

function otherPlayer(player: PlayerId): PlayerId {
  return player === 'P1' ? 'P2' : 'P1'
}

/** Draws the next card for the current player, reshuffling the discard pile into a fresh deck if needed. */
export function drawCard(state: GameState): GameState {
  if (state.status === 'FINISHED') return state
  let drawPile = state.drawPile
  let discardPile = state.discardPile
  let rngState = state.rngState

  if (drawPile.length === 0) {
    const { shuffled, nextSeed } = shuffle(discardPile, rngState)
    drawPile = shuffled
    discardPile = []
    rngState = nextSeed
  }

  const [card, ...rest] = drawPile
  const fallback =
    card === 'PLACE' &&
    playerHasStones(state.board, state.currentPlayer) &&
    adjacentEmptyCellsToPlayer(state.config, state.board, state.currentPlayer).length === 0

  const drawnCard: DrawnCard = { type: card, fallback }

  return {
    ...state,
    drawPile: rest,
    discardPile,
    rngState,
    lastDrawnCard: drawnCard,
    lastPlacedAt: null,
  }
}

/** Legal destination cells for the currently drawn card. */
export function legalPositions(state: GameState): Position[] {
  const card = state.lastDrawnCard
  if (!card) return []
  const { config, board, currentPlayer } = state

  if (card.type === 'JUMP' || card.type === 'BLOCK' || card.fallback) {
    return emptyCells(config, board)
  }

  // PLACE, no fallback needed
  if (!playerHasStones(board, currentPlayer)) {
    return emptyCells(config, board)
  }
  return adjacentEmptyCellsToPlayer(config, board, currentPlayer)
}

function computeResult(config: GameConfig, board: GameState['board']): GameResult {
  const p1Max = largestConnectedGroup(config, board, 'P1')
  const p2Max = largestConnectedGroup(config, board, 'P2')
  const p1Total = totalStones(board, 'P1')
  const p2Total = totalStones(board, 'P2')

  let winner: PlayerId | 'DRAW'
  if (p1Max > p2Max) winner = 'P1'
  else if (p2Max > p1Max) winner = 'P2'
  else if (p1Total > p2Total) winner = 'P1'
  else if (p2Total > p1Total) winner = 'P2'
  else winner = 'DRAW'

  return {
    winner,
    scores: {
      P1: { maxGroup: p1Max, totalStones: p1Total },
      P2: { maxGroup: p2Max, totalStones: p2Total },
    },
  }
}

/** Applies the currently drawn card's action at the given position, then advances the turn. */
export function applyPlacement(state: GameState, position: Position): GameState {
  const card = state.lastDrawnCard
  if (!card) throw new Error('No card has been drawn for this turn.')
  if (!isEmpty(state.board, position)) throw new Error('Target cell is not empty.')

  const legal = legalPositions(state)
  const isLegal = legal.some((p) => p.row === position.row && p.col === position.col)
  if (!isLegal) throw new Error('Illegal move for the drawn card.')

  const owner = card.type === 'BLOCK' ? 'BLOCK' : state.currentPlayer
  const newBoard = state.board.map((row) => row.slice())
  newBoard[position.row][position.col] = owner

  const newDiscard = [...state.discardPile, card.type]
  const newHistory = [
    ...state.history,
    { turnNumber: state.turnNumber, player: state.currentPlayer, card, position },
  ]

  const boardFull = isBoardFull(state.config, newBoard)

  return {
    ...state,
    board: newBoard,
    discardPile: newDiscard,
    history: newHistory,
    lastPlacedAt: position,
    lastDrawnCard: null,
    currentPlayer: otherPlayer(state.currentPlayer),
    turnNumber: state.turnNumber + 1,
    status: boardFull ? 'FINISHED' : 'PLAYING',
    result: boardFull ? computeResult(state.config, newBoard) : null,
  }
}

export { computeResult }
