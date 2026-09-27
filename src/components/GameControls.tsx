import type { GameState, Player } from '../game/types'
import type { GameConfig } from '../gameConfig'

interface Props {
  state: GameState
  config: GameConfig
  forgeMode: boolean
  canForge: boolean
  showSwapPrompt: boolean
  isAiThinking: boolean
  errorMessage: string | null
  onToggleForgeMode: () => void
  onSwap: () => void
  onOpenRules: () => void
  onNewGame: () => void
  onBackToMenu: () => void
}

const PLAYER_LABEL: Record<Player, string> = { A: '赤（先手）', B: '青（後手）' }

function seatLabel(player: Player, config: GameConfig): string {
  if (config.mode === 'hotseat') return PLAYER_LABEL[player]
  return player === config.humanPlayer ? `あなた（${PLAYER_LABEL[player]}）` : `AI（${PLAYER_LABEL[player]}）`
}

export default function GameControls({
  state,
  config,
  forgeMode,
  canForge,
  showSwapPrompt,
  isAiThinking,
  errorMessage,
  onToggleForgeMode,
  onSwap,
  onOpenRules,
  onNewGame,
  onBackToMenu,
}: Props) {
  return (
    <div className="controls">
      <div className="status-row">
        <div className={`turn-indicator turn-${state.currentPlayer.toLowerCase()}`}>
          {state.phase === 'finished' ? '対局終了' : `手番: ${seatLabel(state.currentPlayer, config)}`}
          {isAiThinking && <span className="thinking"> ・AI思考中…</span>}
        </div>
        <div className="turn-count">ターン {state.turnNumber}</div>
      </div>

      <div className="forge-charges">
        <span>フォージ残り　赤: {state.forgeCharges.A}　青: {state.forgeCharges.B}</span>
      </div>

      {state.phase === 'finished' && (
        <div className="result-banner">
          {state.winner === 'draw' ? '引き分けです' : `${seatLabel(state.winner as Player, config)} の勝利！`}
        </div>
      )}

      {showSwapPrompt && (
        <div className="swap-prompt">
          <p>先手の初手が置かれました。この石を奪いますか？</p>
          <button className="primary-button" onClick={onSwap}>
            スワップして奪う
          </button>
          <p className="hint">（奪わない場合は、盤面の好きな空きマスをクリックすると通常どおり自分の石を置けます）</p>
        </div>
      )}

      {state.phase === 'playing' && (
        <div className="action-toggle">
          <button
            className={forgeMode ? 'toggle-button' : 'toggle-button active'}
            onClick={() => forgeMode && onToggleForgeMode()}
          >
            配置モード
          </button>
          <button
            className={forgeMode ? 'toggle-button active' : 'toggle-button'}
            onClick={() => !forgeMode && onToggleForgeMode()}
            disabled={!canForge}
            title={canForge ? undefined : 'フォージ権が無いか、対象となる石がありません'}
          >
            フォージモード
          </button>
        </div>
      )}

      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      <div className="button-row">
        <button className="secondary-button" onClick={onOpenRules}>
          ルールを見る
        </button>
        <button className="secondary-button" onClick={onNewGame}>
          新しいゲーム
        </button>
        <button className="secondary-button" onClick={onBackToMenu}>
          メニューに戻る
        </button>
      </div>
    </div>
  )
}
