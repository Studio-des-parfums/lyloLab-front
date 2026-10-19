import { useFormula, ADJUSTMENTS } from '../context/FormulaContext'
import './QuickAdjustments.css'

export default function QuickAdjustments() {
  const { adjustments, setAdjustmentValue } = useFormula()

  return (
    <div className="adjustments">
      <h3 className="adjustments-title">Ajustements rapides</h3>
      <div className="adjustments-list">
        {ADJUSTMENTS.map((key) => (
          <div key={key} className="adjustment-row">
            <span className="adjustment-label">{key}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={adjustments[key]}
              onChange={(e) =>
                setAdjustmentValue(key, Number(e.target.value))
              }
            />
            <span className="adjustment-value">{adjustments[key]}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
