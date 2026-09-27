import { useEffect, useMemo, useRef, useState } from 'react'
import { applyMove, computeScore, createInitialState, isTerminal, isValidMove } from './game/engine'
import { greedyAI, randomAI } from './game/ai'
import { mulberry32 } from './game/rng'
import type { GameState } from './game/types'
import { Board } from './components/Board'
import { Market } from './components/Market'
import { ScoreBoard } from './components/ScoreBoard'
import { RulesModal } from './components/RulesModal'

type Mode = 'hotseat' | 'vsAiEasy' | 'vsAiHard'

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}

export default function App() {
  const [seed, setSeed] = useState<number>(() => randomSeed())
  const [mode, setMode] = useState<Mode>('vsAiHard')
  const [state, setState] = useState<GameState>(() => createInitialState(seed))
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null)
  const [showRules, setShowRules] = useState(false)
  const aiRngRef = useRef(mulberry32(seed + 1))

  const terminal = isTerminal(state)
  const result = useMemo(() => (terminal ? computeScore(state) : null), [terminal, state])

  const aiControlsPlayer1 = mode !== 'hotseat'
  const isAiTurn = aiControlsPlayer1 && state.currentPlayer === 1 && !terminal

  function restart(newSeed?: number) {
    const s = newSeed ?? randomSeed()
    setSeed(s)
    setState(createInitialState(s))
    setSelectedTileId(null)
    aiRngRef.current = mulberry32(s + 1)
  }

  function handleModeChange(newMode: Mode) {
    setMode(newMode)
    restart()
  }

  // Drive the AI's move automatically, with a short delay so its move is visible/legible.
  useEffect(() => {
    if (!isAiTurn) return
    const timer = setTimeout(() => {
      const strategy = mode === 'vsAiEasy' ? randomAI : greedyAI
      const move = strategy(state, aiRngRef.current)
      setState((prev) => applyMove(prev, move))
    }, 450)
    return () => clearTimeout(timer)
  }, [isAiTurn, state, mode])

  function handleTileSelect(tileId: number) {
    if (isAiTurn) return
    setSelectedTileId((prev) => (prev === tileId ? null : tileId))
  }

  function handleCellClick(cellIndex: number) {
    if (isAiTurn || selectedTileId === null) return
    const move = { tileId: selectedTileId, cellIndex }
    if (!isValidMove(state, move)) return
    setState(applyMove(state, move))
    setSelectedTileId(null)
  }

  return (
    <div className="app">
      <div className="title">
        <h1>ラインクラフト（Line Craft）</h1>
        <p>3枚のタイルから1枚を選び、盤面に置いて、ラインの合計値で勝負しよう</p>
      </div>

      <div className="panel controls-row">
        <label>
          モード:{' '}
          <select value={mode} onChange={(e) => handleModeChange(e.target.value as Mode)}>
            <option value="hotseat">2人対戦（同じ画面）</option>
            <option value="vsAiHard">AI対戦（標準AI）</option>
            <option value="vsAiEasy">AI対戦（ランダムAI・簡単）</option>
          </select>
        </label>
        <button onClick={() => restart()}>新しいゲーム</button>
        <button onClick={() => setShowRules(true)}>ルールを見る</button>
      </div>

      {!terminal && (
        <div className="panel">
          <div className="status-bar">
            <span className={`player-badge p${state.currentPlayer}`}>
              手番: プレイヤー{state.currentPlayer + 1}
              {aiControlsPlayer1 && state.currentPlayer === 1 ? '（AI）' : ''}
            </span>
            <span>
              残りマス: {state.board.filter((c) => c === null).length} / {state.board.length}
            </span>
          </div>
        </div>
      )}

      {!terminal && (
        <div className="panel">
          <p style={{ textAlign: 'center', margin: '0 0 8px' }}>
            {isAiTurn ? 'AIが考え中…' : selectedTileId === null ? 'タイルを1枚選んでください' : '置きたいマスをクリック'}
          </p>
          <Market market={state.market} selectedTileId={selectedTileId} onSelect={handleTileSelect} disabled={isAiTurn} />
        </div>
      )}

      <div className="panel">
        <Board board={state.board} onCellClick={handleCellClick} disabled={isAiTurn || selectedTileId === null} />
      </div>

      {terminal && result && (
        <div className="panel">
          <ScoreBoard result={result} />
        </div>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      <p style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.5 }}>seed: {seed}</p>
    </div>
  )
}
