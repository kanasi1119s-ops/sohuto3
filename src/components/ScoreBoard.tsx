import type { ScoreResult } from '../game/types'

interface Props {
  result: ScoreResult
}

const lineLabel = (kind: string, index: number) => {
  if (kind === 'row') return `横${index + 1}`
  if (kind === 'col') return `縦${index + 1}`
  return index === 0 ? '斜め（左上→右下）' : '斜め（右上→左下）'
}

export function ScoreBoard({ result }: Props) {
  const winnerText =
    result.winner === 'draw'
      ? '引き分け！'
      : `プレイヤー${result.winner + 1}の勝ち！`

  return (
    <div>
      <div className="result-banner">{winnerText}</div>
      <p style={{ textAlign: 'center' }}>
        ライン得点: プレイヤー1 {result.linePoints[0]} - {result.linePoints[1]} プレイヤー2
        （合計値: {result.totalValue[0]} - {result.totalValue[1]}）
      </p>
      <table className="score-table">
        <thead>
          <tr>
            <th>ライン</th>
            <th>P1 合計</th>
            <th>P2 合計</th>
            <th>結果</th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((line) => (
            <tr key={`${line.kind}-${line.index}`}>
              <td>{lineLabel(line.kind, line.index)}</td>
              <td>{line.sumByPlayer[0]}</td>
              <td>{line.sumByPlayer[1]}</td>
              <td>{line.winner === 'tie' ? '引き分け' : `P${line.winner + 1}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
