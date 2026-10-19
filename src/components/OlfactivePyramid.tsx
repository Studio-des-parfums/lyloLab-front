import { Droplet, Flower2, TreeDeciduous } from 'lucide-react'
import { pyramid } from '../data/mockFormula'
import './OlfactivePyramid.css'

const icons = [
  <Droplet size={16} />,
  <Flower2 size={16} />,
  <TreeDeciduous size={16} />,
]

export default function OlfactivePyramid() {
  return (
    <div className="pyramid">
      <h3 className="pyramid-title">Pyramide olfactive</h3>
      <ul className="pyramid-list">
        {pyramid.map((level, i) => (
          <li key={level.label} className="pyramid-item">
            <div className="pyramid-icon">{icons[i]}</div>
            <div className="pyramid-content">
              <div className="pyramid-row">
                <span className="pyramid-label">{level.label}</span>
                <span className="pyramid-duration">{level.duration}</span>
              </div>
              <p className="pyramid-ingredients">{level.ingredients}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
