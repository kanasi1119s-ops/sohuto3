import { RULES_SECTIONS } from '../game/rulesText'

interface Props {
  onClose: () => void
}

export default function RulesModal({ onClose }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="ルール説明">
      <div className="modal">
        <div className="modal-header">
          <h2>LinkForge のルール</h2>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="modal-body">
          {RULES_SECTIONS.map((section) => (
            <section key={section.heading} className="rules-section">
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        <div className="modal-footer">
          <button className="primary-button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
