import type { Tile } from '../game/types'

interface Props {
  market: Tile[]
  selectedTileId: number | null
  onSelect: (tileId: number) => void
  disabled: boolean
}

export function Market({ market, selectedTileId, onSelect, disabled }: Props) {
  return (
    <div className="market" role="group" aria-label="マーケット（ドラフト対象のタイル）">
      {market.map((tile) => (
        <button
          key={tile.id}
          className={`tile ${tile.id === selectedTileId ? 'selected' : ''}`}
          onClick={() => onSelect(tile.id)}
          disabled={disabled}
          aria-pressed={tile.id === selectedTileId}
          aria-label={`タイル ${tile.value}`}
        >
          {tile.value}
        </button>
      ))}
      {market.length === 0 && <p style={{ opacity: 0.6 }}>山札が尽きました</p>}
    </div>
  )
}
