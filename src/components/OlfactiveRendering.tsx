import { olfactiveTags } from '../data/mockFormula'
import './OlfactiveRendering.css'

export default function OlfactiveRendering() {
  return (
    <div className="rendering">
      <h3 className="rendering-title">Rendu olfactif</h3>
      <div className="rendering-tags">
        {olfactiveTags.map((tag, i) => (
          <span key={tag} className="rendering-tag">
            {tag}
            {i < olfactiveTags.length - 1 && <span className="dot"> · </span>}
          </span>
        ))}
      </div>
    </div>
  )
}
