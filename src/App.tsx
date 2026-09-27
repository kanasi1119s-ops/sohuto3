import { useEffect, useMemo, useRef, useState } from 'react'
import Board from './components/Board'
import GameControls from './components/GameControls'
import RulesModal from './components/RulesModal'
import { chooseAction } from './game/ai'
import { applyAction, canForge as engineCanForge, createInitialState, isProtected, otherPlayer } from './game/engine'
import { createRng } from './game/rng'
import type { GameState } from './game/types'
import { DEFAULT_CONFIG, type GameConfig } from './gameConfig'

type Screen = 'menu' | 'game'

function MenuScreen({ onStart }: { onStart: (config: GameConfig) => void }) {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)

  return (
    <div className="menu">
      <h1>LinkForge（リンクフォージ）</h1>
      <p className="tagline">7×7の盤面で石を5つつなげろ。限られた「フォージ」で相手の石を奪い合う2人対戦アブストラクトゲーム。</p>

      <fieldset>
        <legend>対戦モード</legend>
        <label>
          <input
            type="radio"
            name="mode"
            checked={config.mode === 'vs-ai'}
            onChange={() => setConfig({ ...config, mode: 'vs-ai' })}
          />
          1人 vs AI
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            checked={config.mode === 'hotseat'}
            onChange={() => setConfig({ ...config, mode: 'hotseat' })}
          />
          2人対戦（ホットシート・同じ端末を交代で操作）
        </label>
      </fieldset>

      {config.mode === 'vs-ai' && (
        <>
          <fieldset>
            <legend>あなたの色</legend>
            <label>
              <input
                type="radio"
                name="seat"
                checked={config.humanPlayer === 'A'}
                onChange={() => setConfig({ ...config, humanPlayer: 'A' })}
              />
              赤（先手）
            </label>
            <label>
              <input
                type="radio"
                name="seat"
                checked={config.humanPlayer === 'B'}
                onChange={() => setConfig({ ...config, humanPlayer: 'B' })}
              />
              青（後手）
            </label>
          </fieldset>

          <fieldset>
            <legend>AIの強さ</legend>
            <label>
              <input
                type="radio"
                name="difficulty"
                checked={config.aiDifficulty === 'random'}
                onChange={() => setConfig({ ...config, aiDifficulty: 'random' })}
              />
              ランダム（初心者向け）
            </label>
            <label>
              <input
                type="radio"
                name="difficulty"
                checked={config.aiDifficulty === 'greedy'}
                onChange={() => setConfig({ ...config, aiDifficulty: 'greedy' })}
              />
              貪欲法（本気で挑む）
            </label>
          </fieldset>
        </>
      )}

      <button className="primary-button start-button" onClick={() => onStart(config)}>
        ゲーム開始
      </button>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [gameState, setGameState] = useState<GameState>(() => createInitialState())
  const [forgeMode, setForgeMode] = useState(false)
  const [forgeTarget, setForgeTarget] = useState<number | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const rngRef = useRef(createRng(Date.now()))

  const aiSeat = config.mode === 'vs-ai' ? otherPlayer(config.humanPlayer) : null
  const isAiTurn = aiSeat !== null && gameState.phase !== 'finished' && gameState.currentPlayer === aiSeat

  useEffect(() => {
    if (!isAiTurn) return
    const timer = setTimeout(() => {
      const action = chooseAction(gameState, config.aiDifficulty, rngRef.current)
      const result = applyAction(gameState, action)
      if (result.error) {
        // AIロジックのバグ以外では起こらないはずだが、フリーズを避けるためログのみ残す
        console.error('AI action rejected:', result.error, action)
        return
      }
      setGameState(result.state)
      setForgeMode(false)
      setForgeTarget(null)
    }, 450)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, isAiTurn, config.aiDifficulty])

  const humanTurn = useMemo(() => {
    if (gameState.phase === 'finished') return false
    if (config.mode === 'hotseat') return true
    return gameState.currentPlayer === config.humanPlayer
  }, [gameState, config])

  const showSwapPrompt =
    gameState.phase === 'opening-wait-swap' &&
    gameState.currentPlayer === 'B' &&
    (config.mode === 'hotseat' || config.humanPlayer === 'B')

  function startGame(newConfig: GameConfig) {
    setConfig(newConfig)
    setGameState(createInitialState())
    setForgeMode(false)
    setForgeTarget(null)
    setErrorMessage(null)
    rngRef.current = createRng(Date.now())
    setScreen('game')
  }

  function handleNewGame() {
    setGameState(createInitialState())
    setForgeMode(false)
    setForgeTarget(null)
    setErrorMessage(null)
    rngRef.current = createRng(Date.now())
  }

  function handleToggleForgeMode() {
    setForgeMode((prev) => !prev)
    setForgeTarget(null)
    setErrorMessage(null)
  }

  function handleSwap() {
    const result = applyAction(gameState, { type: 'swap' })
    if (result.error) {
      setErrorMessage(result.error)
      return
    }
    setGameState(result.state)
    setErrorMessage(null)
  }

  function handleCellClick(index: number) {
    if (!humanTurn) return
    setErrorMessage(null)

    if (forgeMode) {
      if (forgeTarget === null) {
        const opponent = otherPlayer(gameState.currentPlayer)
        if (gameState.board[index] !== opponent) {
          setErrorMessage('フォージの対象は相手の石です')
          return
        }
        if (isProtected(gameState.board, gameState.size, index)) {
          setErrorMessage('その石は3連結以上のグループに属しており保護されています')
          return
        }
        setForgeTarget(index)
        return
      }
      const result = applyAction(gameState, { type: 'forge', target: forgeTarget, cell: index })
      if (result.error) {
        setErrorMessage(result.error)
        return
      }
      setGameState(result.state)
      setForgeMode(false)
      setForgeTarget(null)
      return
    }

    const result = applyAction(gameState, { type: 'place', cell: index })
    if (result.error) {
      setErrorMessage(result.error)
      return
    }
    setGameState(result.state)
  }

  if (screen === 'menu') {
    return <MenuScreen onStart={startGame} />
  }

  return (
    <div className="app">
      <Board
        board={gameState.board}
        size={gameState.size}
        winningLine={gameState.winningLine}
        forgeTarget={forgeTarget}
        disabled={!humanTurn}
        onCellClick={handleCellClick}
      />
      <GameControls
        state={gameState}
        config={config}
        forgeMode={forgeMode}
        canForge={humanTurn && engineCanForge(gameState)}
        showSwapPrompt={showSwapPrompt}
        isAiThinking={isAiTurn}
        errorMessage={errorMessage}
        onToggleForgeMode={handleToggleForgeMode}
        onSwap={handleSwap}
        onOpenRules={() => setRulesOpen(true)}
        onNewGame={handleNewGame}
        onBackToMenu={() => setScreen('menu')}
      />
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  )
}
