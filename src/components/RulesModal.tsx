import { RULES_TEXT } from '../rulesText'

interface Props {
  onClose: () => void
}

export function RulesModal({ onClose }: Props) {
  return (
    <div className="rules-modal-backdrop" onClick={onClose}>
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>ルール</h2>
          <button onClick={onClose} aria-label="閉じる">
            閉じる
          </button>
        </div>
        <div>{RULES_TEXT}</div>
      </div>
    </div>
  )
}
