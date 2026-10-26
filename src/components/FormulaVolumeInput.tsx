import { FlaskConical, Minus, Plus } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import './FormulaVolumeInput.css'

const PRESETS = [30, 50, 100]
const STEP = 5

export default function FormulaVolumeInput() {
  const { totalVolumeMl, setTotalVolumeMl, isLocked } = useFormula()

  function nudge(delta: number) {
    setTotalVolumeMl(Math.max(0, Math.round(totalVolumeMl + delta)))
  }

  return (
    <div className="formula-volume">
      <span className="formula-settings-label">
        <FlaskConical size={13} /> Volume total
      </span>

      <div className="formula-volume-control">
        <button
          type="button"
          disabled={isLocked}
          className="formula-volume-step"
          onClick={() => nudge(-STEP)}
          aria-label={`Diminuer de ${STEP} ml`}
        >
          <Minus size={14} />
        </button>

        <label className="formula-volume-input">
          <input
            type="number"
            min="0"
            step="1"
            value={totalVolumeMl}
            onChange={(e) => {
              const value = Number(e.target.value)
              setTotalVolumeMl(Number.isFinite(value) && value >= 0 ? value : 0)
            }}
            disabled={isLocked}
            aria-label="Volume total en millilitres"
          />
          <span>ml</span>
        </label>

        <button
          type="button"
          disabled={isLocked}
          className="formula-volume-step"
          onClick={() => nudge(STEP)}
          aria-label={`Augmenter de ${STEP} ml`}
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="formula-volume-presets">
        {PRESETS.map((preset) => (
          <button
            type="button"
          disabled={isLocked}
            key={preset}
            className={totalVolumeMl === preset ? 'active' : ''}
            onClick={() => setTotalVolumeMl(preset)}
          >
            {preset} ml
          </button>
        ))}
      </div>
    </div>
  )
}
