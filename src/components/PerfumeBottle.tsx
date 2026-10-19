import { useFormula } from '../context/FormulaContext'
import './PerfumeBottle.css'

export default function PerfumeBottle() {
  const { formulaName } = useFormula()

  return (
    <div className="bottle-card">
      <h3 className="bottle-title">Mon flacon</h3>
      <div className="bottle-visual">
        <svg viewBox="0 0 100 140" width="90" height="126">
          <rect x="40" y="8" width="20" height="14" rx="2" fill="#c9a24a" />
          <rect x="44" y="2" width="12" height="8" rx="2" fill="#8a8373" />
          <path
            d="M32 22 h36 v14 c10 8 14 20 14 34 v50 a8 8 0 0 1 -8 8 H26 a8 8 0 0 1 -8 -8 V70 c0 -14 4 -26 14 -34 Z"
            fill="#f3e4c4"
            stroke="#c9a24a"
            strokeWidth="1.5"
          />
          <rect x="24" y="88" width="52" height="26" rx="4" fill="#fff" opacity="0.85" />
        </svg>
      </div>
      <p className="bottle-name">{formulaName}</p>
    </div>
  )
}
