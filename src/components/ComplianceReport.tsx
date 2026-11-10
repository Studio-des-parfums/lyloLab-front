import { useFormula } from '../context/FormulaContext'
import { computeFormulaShares } from '../data/formulaEngine'
import { evaluateFormulaCompliance } from '../data/ifraCompliance'
import { listCustomLimits, type CustomLimit } from '../data/regulationsApi'
import { useEffect, useState } from 'react'
import './ComplianceReport.css'

export default function ComplianceReport() {
  const { favorites, facets, adjustments, catalog } = useFormula()
  const shares = computeFormulaShares(favorites, facets, adjustments, catalog)
  const compliance = evaluateFormulaCompliance(shares)
  const [customLimits, setCustomLimits] = useState<CustomLimit[]>([])

  useEffect(() => {
    listCustomLimits()
      .then(setCustomLimits)
      .catch(() => setCustomLimits([]))
  }, [])

  // Materials of this formula above a limit set by a custom regulation.
  const customViolations = customLimits.flatMap((limit) => {
    const share = shares.find((s) => s.material.id === limit.materialId)
    if (!share || share.percent <= limit.maxPercent + 1e-9) return []
    return [{ ...limit, material: share.material.name, percent: share.percent }]
  })

  if (shares.length === 0) {
    return (
      <div className="compliance-report">
        <h3 className="card-title">Rapport de conformité réglementaire</h3>
        <p className="compliance-empty">
          Ajoutez des matières premières favorites pour générer le rapport de
          conformité de la formule.
        </p>
      </div>
    )
  }

  const okCount = compliance.materials.filter((m) => m.level === 'ok').length

  return (
    <div className="compliance-report">
      <h3 className="card-title">Rapport de conformité réglementaire</h3>
      <p className="card-subtitle">
        Statut IFRA Cat.4, allergènes UE et réglementation internationale pour
        chaque matière de la formule active.
      </p>

      <div className="compliance-summary">
        <div className="compliance-summary-item compliance-summary-ok">
          <strong>{okCount}</strong>
          <span>Conformes</span>
        </div>
        <div className="compliance-summary-item compliance-summary-warning">
          <strong>{compliance.cappedCount}</strong>
          <span>Plafonnées IFRA</span>
        </div>
        <div className="compliance-summary-item compliance-summary-warning">
          <strong>{compliance.allergenCount}</strong>
          <span>Allergènes UE</span>
        </div>
        <div className="compliance-summary-item compliance-summary-error">
          <strong>{compliance.bannedCount}</strong>
          <span>Interdites (exclues)</span>
        </div>
      </div>

      {compliance.overlappingAllergens.length > 0 && (
        <p className="compliance-recombi-note">
          ⚠ Cumul d'allergènes entre plusieurs matières de cette formule :{' '}
          {compliance.overlappingAllergens.join(', ')}.
        </p>
      )}

      {customViolations.length > 0 && (
        <div className="compliance-custom">
          <strong>Réglementations personnalisées non respectées :</strong>
          <ul>
            {customViolations.map((v) => (
              <li key={`${v.regulationId}-${v.materialId}`}>
                {v.material} : {v.percent.toFixed(2)} %{' '}
                {v.maxPercent === 0 ? '(interdite)' : `(max ${v.maxPercent} %)`} — {v.regulation}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="compliance-table-wrapper">
        <table className="compliance-table">
          <thead>
            <tr>
              <th>Matière première</th>
              <th>%</th>
              <th>Limite IFRA Cat.4</th>
              <th>Allergène UE</th>
              <th>USA (MoCRA)</th>
              <th>Californie</th>
              <th>Chine (CSAR)</th>
              <th>MENA</th>
            </tr>
          </thead>
          <tbody>
            {compliance.materials.map(({ share, level, limitPercent, allergens, messages }) => {
              const reg = share.material.regulatory
              return (
                <tr key={share.material.id} className={`compliance-row-${level}`}>
                  <td>
                    {share.material.name}
                    {messages.length > 0 && (
                      <span className="compliance-row-note" title={messages.join(' ')}>
                        {' '}
                        ⚠
                      </span>
                    )}
                  </td>
                  <td>{share.percent.toFixed(2)}</td>
                  <td>{limitPercent !== null ? `${limitPercent}%` : '—'}</td>
                  <td>{allergens.length > 0 ? allergens.join(', ') : '—'}</td>
                  <td>{reg?.usaMocra ?? '—'}</td>
                  <td>{reg?.californiaProp65 ?? '—'}</td>
                  <td>{reg?.chinaCsar ?? '—'}</td>
                  <td>{reg?.menaGso ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
