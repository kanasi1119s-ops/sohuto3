import type { Cell as CellValue } from '../game/types'

interface Props {
  board: readonly CellValue[]
  size: number
  winningLine: readonly number[] | null
  forgeTarget: number | null
  disabled: boolean
  onCellClick: (index: number) => void
}

export default function Board({ board, size, winningLine, forgeTarget, disabled, onCellClick }: Props) {
  const winningSet = new Set(winningLine ?? [])
  return (
    <div
      className="board"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      role="grid"
      aria-label="LinkForge 盤面"
    >
      {board.map((value, index) => {
        const classes = ['cell']
        if (value === 'A') classes.push('cell-a')
        if (value === 'B') classes.push('cell-b')
        if (winningSet.has(index)) classes.push('cell-winning')
        if (forgeTarget === index) classes.push('cell-forge-target')
        return (
          <button
            key={index}
            type="button"
            className={classes.join(' ')}
            onClick={() => onCellClick(index)}
            disabled={disabled}
            aria-label={`マス ${index}`}
          >
            {value === 'A' && <span className="stone stone-a" />}
            {value === 'B' && <span className="stone stone-b" />}
          </button>
        )
      })}
    </div>
  )
}
