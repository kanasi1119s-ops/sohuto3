import { RULES_SECTIONS } from '../data/rulesText'

interface Props {
  onClose: () => void
}

export function RulesModal({ onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>遊び方</h2>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {RULES_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </section>
          ))}
          <p className="rules-footnote">
            詳しいルールブックは <code>docs/rules.md</code> にあります。
          </p>
        </div>
      </div>
    </div>
  )
}
