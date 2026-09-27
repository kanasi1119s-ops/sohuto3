import { useEffect, useRef, useState } from 'react'
import { Board } from './components/Board'
import { RulesModal } from './components/RulesModal'
import { chooseAiMove } from './game/ai'
import { applyPlacement, createGame, drawCard, legalPositions } from './game/engine'
import type { CardType, GameState, PlayerId, Position } from './game/types'

const CARD_LABELS: Record<CardType, { label: string; desc: string; emoji: string }> = {
  PLACE: { label: 'PLACE（通常配置）', desc: '自分の石に隣接する空きマスに置く', emoji: '🔴' },
  JUMP: { label: 'JUMP（自由配置）', desc: 'どこでも好きな空きマスに置く', emoji: '⚡' },
  BLOCK: { label: 'BLOCK（妨害）', desc: 'どこでも障害物を置いて相手を妨害する', emoji: '⛔' },
}

const PLAYER_LABELS: Record<PlayerId, string> = { P1: 'プレイヤー1（赤）', P2: 'プレイヤー2（青）' }

type Mode = 'MENU' | 'PLAYING'

function makeSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0
}

export default function App() {
  const [mode, setMode] = useState<Mode>('MENU')
  const [vsCpu, setVsCpu] = useState(true)
  const [cpuPlayer, setCpuPlayer] = useState<PlayerId>('P2')
  const [game, setGame] = useState<GameState | null>(null)
  const [showRules, setShowRules] = useState(false)
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current)
    }
  }, [])

  function startGame() {
    setGame(createGame(makeSeed()))
    setMode('PLAYING')
  }

  function backToMenu() {
    if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current)
    setGame(null)
    setMode('MENU')
  }

  const isCpuTurn = !!game && vsCpu && game.currentPlayer === cpuPlayer && game.status === 'PLAYING'

  // CPU turn automation: draw, then place, each with a short delay for readability.
  useEffect(() => {
    if (!game || !isCpuTurn) return

    if (game.lastDrawnCard === null) {
      cpuTimerRef.current = setTimeout(() => {
        setGame((g) => (g ? drawCard(g) : g))
      }, 500)
      return () => {
        if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current)
      }
    }

    cpuTimerRef.current = setTimeout(() => {
      setGame((g) => {
        if (!g || !g.lastDrawnCard) return g
        const { position } = chooseAiMove(g, 'greedy', makeSeed())
        return applyPlacement(g, position)
      })
    }, 700)
    return () => {
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current)
    }
  }, [game, isCpuTurn])

  if (mode === 'MENU' || !game) {
    return (
      <div className="app menu-screen">
        <h1>コネクロス</h1>
        <p className="subtitle">ConneCross ― 陣取り × カードドローの2人用ボードゲーム</p>
        <div className="menu-card">
          <label className="menu-option">
            <input type="checkbox" checked={vsCpu} onChange={(e) => setVsCpu(e.target.checked)} />
            CPU（AI）と対戦する
          </label>
          {vsCpu && (
            <label className="menu-option">
              先手（プレイヤー1）は誰？
              <select
                value={cpuPlayer === 'P1' ? 'cpu' : 'human'}
                onChange={(e) => setCpuPlayer(e.target.value === 'cpu' ? 'P1' : 'P2')}
              >
                <option value="human">あなた</option>
                <option value="cpu">CPU</option>
              </select>
            </label>
          )}
          <button className="primary-button" onClick={startGame}>
            ゲームを始める
          </button>
          <button className="link-button" onClick={() => setShowRules(true)}>
            遊び方を見る
          </button>
        </div>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </div>
    )
  }

  const legal = game.lastDrawnCard ? legalPositions(game) : []
  const interactive = !isCpuTurn && game.status === 'PLAYING' && !!game.lastDrawnCard

  function handleDraw() {
    setGame((g) => (g ? drawCard(g) : g))
  }

  function handleCellClick(pos: Position) {
    setGame((g) => (g ? applyPlacement(g, pos) : g))
  }

  return (
    <div className="app play-screen">
      <header className="topbar">
        <h1>コネクロス</h1>
        <div className="topbar-actions">
          <button className="link-button" onClick={() => setShowRules(true)}>
            遊び方
          </button>
          <button className="link-button" onClick={backToMenu}>
            メニューへ
          </button>
        </div>
      </header>

      <div className="status-row">
        <div className={`player-badge ${game.currentPlayer === 'P1' ? 'active' : ''}`}>
          {PLAYER_LABELS.P1}
          {vsCpu && cpuPlayer === 'P1' ? '（CPU）' : ''}
        </div>
        <div className={`player-badge ${game.currentPlayer === 'P2' ? 'active' : ''}`}>
          {PLAYER_LABELS.P2}
          {vsCpu && cpuPlayer === 'P2' ? '（CPU）' : ''}
        </div>
      </div>

      <div className="turn-info">
        <p>
          ターン {game.turnNumber} ／ 手番: <strong>{PLAYER_LABELS[game.currentPlayer]}</strong>
          {isCpuTurn ? '（考え中…）' : ''}
        </p>
        {game.lastDrawnCard ? (
          <div className="card-display">
            <span className="card-emoji">{CARD_LABELS[game.lastDrawnCard.type].emoji}</span>
            <div>
              <strong>{CARD_LABELS[game.lastDrawnCard.type].label}</strong>
              <p>{CARD_LABELS[game.lastDrawnCard.type].desc}</p>
              {game.lastDrawnCard.fallback && <p className="fallback-note">（隣接マスが無いため自由配置になります）</p>}
            </div>
          </div>
        ) : (
          !isCpuTurn && (
            <button className="primary-button" onClick={handleDraw}>
              カードをめくる
            </button>
          )
        )}
      </div>

      <Board
        config={game.config}
        board={game.board}
        legalCells={legal}
        lastPlacedAt={game.lastPlacedAt}
        onCellClick={handleCellClick}
        interactive={interactive}
      />

      <div className="deck-info">
        山札: {game.drawPile.length}枚 ／ 捨て札: {game.discardPile.length}枚
      </div>

      {game.status === 'FINISHED' && game.result && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>ゲーム終了</h2>
            </div>
            <div className="modal-body">
              <p className="result-headline">
                {game.result.winner === 'DRAW' ? '引き分け！' : `${PLAYER_LABELS[game.result.winner]} の勝利！`}
              </p>
              <table className="result-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>最大連結</th>
                    <th>総石数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{PLAYER_LABELS.P1}</td>
                    <td>{game.result.scores.P1.maxGroup}</td>
                    <td>{game.result.scores.P1.totalStones}</td>
                  </tr>
                  <tr>
                    <td>{PLAYER_LABELS.P2}</td>
                    <td>{game.result.scores.P2.maxGroup}</td>
                    <td>{game.result.scores.P2.totalStones}</td>
                  </tr>
                </tbody>
              </table>
              <div className="modal-actions">
                <button className="primary-button" onClick={startGame}>
                  もう一度遊ぶ
                </button>
                <button className="link-button" onClick={backToMenu}>
                  メニューへ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  )
}
