import type { CellOwner, GameConfig, Position } from '../game/types'

interface Props {
  config: GameConfig
  board: CellOwner[][]
  legalCells: Position[]
  lastPlacedAt: Position | null
  onCellClick: (pos: Position) => void
  interactive: boolean
}

function cellClass(owner: CellOwner): string {
  if (owner === 'P1') return 'cell cell-p1'
  if (owner === 'P2') return 'cell cell-p2'
  if (owner === 'BLOCK') return 'cell cell-block'
  return 'cell cell-empty'
}

export function Board({ config, board, legalCells, lastPlacedAt, onCellClick, interactive }: Props) {
  const legalSet = new Set(legalCells.map((p) => `${p.row},${p.col}`))

  return (
    <div
      className="board"
      style={{ gridTemplateColumns: `repeat(${config.boardSize}, 1fr)` }}
      role="grid"
      aria-label="コネクロス盤面"
    >
      {board.map((row, rowIdx) =>
        row.map((owner, colIdx) => {
          const key = `${rowIdx},${colIdx}`
          const isLegal = interactive && legalSet.has(key)
          const isLast = lastPlacedAt?.row === rowIdx && lastPlacedAt?.col === colIdx
          return (
            <button
              key={key}
              className={`${cellClass(owner)} ${isLegal ? 'cell-legal' : ''} ${isLast ? 'cell-last' : ''}`}
              onClick={() => isLegal && onCellClick({ row: rowIdx, col: colIdx })}
              disabled={!isLegal}
              role="gridcell"
              aria-label={`row ${rowIdx + 1} col ${colIdx + 1}`}
            />
          )
        }),
      )}
    </div>
  )
}
