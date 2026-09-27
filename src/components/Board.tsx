import type { Cell } from '../game/types'
import { BOARD_SIZE } from '../game/types'

interface Props {
  board: Cell[]
  onCellClick: (index: number) => void
  disabled: boolean
}

export function Board({ board, onCellClick, disabled }: Props) {
  return (
    <div className="board" role="grid" aria-label="ゲーム盤面 4x4">
      {board.map((cell, index) => {
        const isEmpty = cell === null
        const className = `cell ${isEmpty ? 'empty' : `p${cell.owner}`}`
        return (
          <button
            key={index}
            className={className}
            disabled={disabled || !isEmpty}
            onClick={() => onCellClick(index)}
            aria-label={
              isEmpty
                ? `${Math.floor(index / BOARD_SIZE) + 1}行${(index % BOARD_SIZE) + 1}列 空きマス`
                : `${Math.floor(index / BOARD_SIZE) + 1}行${(index % BOARD_SIZE) + 1}列 プレイヤー${cell.owner + 1}の${cell.value}`
            }
          >
            {cell ? cell.value : ''}
          </button>
        )
      })}
    </div>
  )
}
