import type { Tile } from './types'

/** 16 tiles: values 1-4, four copies each. Data-driven, separate from engine logic. */
export function buildTileSet(): Tile[] {
  const values: Array<Tile['value']> = [1, 2, 3, 4]
  const tiles: Tile[] = []
  let id = 0
  for (const value of values) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({ id: id++, value })
    }
  }
  return tiles
}
