import { useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import { allocateWithCaps, applyManualMl, computeFormulaShares } from '../data/formulaEngine'
import { evaluateFormulaCompliance, type ComplianceLevel } from '../data/ifraCompliance'
import './FormulaTable.css'

const STATUS_ICON: Record<ComplianceLevel, string> = {
  ok: '✓',
  warning: '⚠',
  violation: '⛔',
}

const formatMl = (value: number) => Number(value.toFixed(2)).toString()

function MlInput({
  value,
  disabled,
  onCommit,
}: {
  value: number
  disabled: boolean
  onCommit: (ml: number) => void
}) {
  const [draft, setDraft] = useState(() => formatMl(value))
  const [lastValue, setLastValue] = useState(value)
  const skipBlurCommit = useRef(false)

  if (value !== lastValue) {
    setLastValue(value)
    setDraft(formatMl(value))
  }

  function commit() {
    const parsed = Number(draft.replace(',', '.'))
    if (!Number.isFinite(parsed)) {
      setDraft(formatMl(value))
      return
    }
    onCommit(parsed)
  }

  function blurWithoutCommit() {
    skipBlurCommit.current = true
    setDraft(formatMl(value))
  }

  return (
    <span className="formula-ml-input">
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        aria-label="Quantité en ml"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (skipBlurCommit.current) {
            skipBlurCommit.current = false
            return
          }
          commit()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
            skipBlurCommit.current = true
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            blurWithoutCommit()
            e.currentTarget.blur()
          }
        }}
      />
      <span className="formula-ml-unit">ml</span>
    </span>
  )
}

export default function FormulaTable() {
  const {
    favorites,
    facets,
    adjustments,
    catalog,
    totalVolumeMl,
    manualMl,
    setManualMl,
    isLocked,
  } = useFormula()

  const computedShares = computeFormulaShares(favorites, facets, adjustments, catalog)
  const shares = applyManualMl(computedShares, manualMl, totalVolumeMl)

  const total = shares.reduce((sum, s) => sum + s.percent, 0)
  const totalMl = shares.reduce((sum, s) => sum + (s.percent / 100) * totalVolumeMl, 0)
  const compliance = evaluateFormulaCompliance(shares)

  function setMl(index: number, raw: number) {
    if (totalVolumeMl <= 0) return

    const edited = shares[index]
    if (!edited) return

    const capMl =
      edited.ifraLimitPercent === null
        ? totalVolumeMl
        : (edited.ifraLimitPercent / 100) * totalVolumeMl
    const target = Math.min(Math.max(raw, 0), capMl)
    const remaining = Math.max(totalVolumeMl - target, 0)

    const others = shares.filter((_, i) => i !== index)
    const weights = others.map((share) => {
      const ml = manualMl?.[share.material.id] ?? (share.percent / 100) * totalVolumeMl
      return Math.max(ml, 0.0001)
    })
    const caps = others.map((share) =>
      share.ifraLimitPercent === null
        ? null
        : (share.ifraLimitPercent / 100) * totalVolumeMl,
    )
    const allocation = allocateWithCaps(weights, caps, remaining)

    const next: Record<string, number> = { [edited.material.id]: target }
    others.forEach((share, i) => {
      next[share.material.id] = allocation.shares[i]
    })
    setManualMl(next)
  }

  return (
    <div className="formula-table-wrapper">
      <div className="formula-table-head">
        <h3 className="formula-table-title">Formule indicative</h3>
        {manualMl && !isLocked && (
          <button
            type="button"
            className="formula-table-reset"
            onClick={() => setManualMl(null)}
            title="Revenir à la répartition automatique du moteur"
          >
            <RotateCcw size={12} />
            Recalculer auto
          </button>
        )}
      </div>
      {shares.length === 0 ? (
        <p className="formula-table-empty">
          Ajoutez des matières premières favorites pour générer la formule.
        </p>
      ) : (
        <>
          {manualMl && !isLocked && (
            <p className="formula-table-hint">
              Répartition manuelle : les quantités en ml sont éditables, le reste de la
              formule se rééquilibre. Entrée pour valider.
            </p>
          )}
          {(compliance.bannedCount > 0 || compliance.overlappingAllergens.length > 0) && (
            <div className="formula-compliance-banner formula-compliance-banner-error">
              {compliance.bannedCount > 0 && (
                <p>
                  ⛔ {compliance.bannedCount} matière(s) interdite(s) en Cat.4 ont été
                  automatiquement exclues de la formule.
                </p>
              )}
              {compliance.overlappingAllergens.length > 0 && (
                <p>
                  ⚠ Cumul d'allergènes entre plusieurs matières :{' '}
                  {compliance.overlappingAllergens.join(', ')}.
                </p>
              )}
            </div>
          )}
          {compliance.bannedCount === 0 &&
            (compliance.cappedCount > 0 || compliance.allergenCount > 0) && (
              <div className="formula-compliance-banner formula-compliance-banner-warning">
                {compliance.cappedCount > 0 && (
                  <p>
                    ⚠ {compliance.cappedCount} matière(s) ont été automatiquement
                    plafonnées pour respecter leur limite IFRA Cat.4 ; le reste de la
                    formule a été redistribué sur les autres matières.
                  </p>
                )}
                {compliance.allergenCount > 0 && (
                  <p>
                    ⚠ {compliance.allergenCount} matière(s) contiennent un allergène UE
                    déclarable.
                  </p>
                )}
              </div>
            )}

          <table className="formula-table">
            <thead>
              <tr>
                <th>Matière première</th>
                <th>%</th>
                <th>ml</th>
                <th>Conformité</th>
              </tr>
            </thead>
            <tbody>
              {compliance.materials.map(({ share, level, messages }, index) => {
                const ml = (share.percent / 100) * totalVolumeMl
                const banned = share.ifraLimitPercent === 0
                return (
                  <tr key={share.material.id} className={`formula-row-${level}`}>
                    <td>{share.material.name}</td>
                    <td>{share.percent.toFixed(1)}</td>
                    <td>
                      <MlInput
                        value={ml}
                        disabled={banned || isLocked}
                        onCommit={(next) => setMl(index, next)}
                      />
                    </td>
                    <td>
                      <span
                        className={`formula-status formula-status-${level}`}
                        title={messages.join(' ') || 'Aucune alerte connue.'}
                      >
                        {STATUS_ICON[level]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{total.toFixed(1)}</td>
                <td>{totalMl.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  )
}
