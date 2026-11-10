import { useEffect, useState } from 'react'
import {
  CONCLUSION_LABEL,
  GRADE_LABEL,
  formatDate,
  getMaterialStability,
  getStabilityCatalog,
  type MaterialStabilityDetail,
  type StabilityCatalog,
} from '../data/stabilityApi'
import { RiskChips, TriggerChips } from './StabilityRiskPanel'
import './StabilityRiskPanel.css'

/** Material sheet: known stability data, official specs and what the lab observed. */
export default function MaterialStabilitySection({ materialId }: { materialId: string }) {
  const [data, setData] = useState<MaterialStabilityDetail | null>(null)
  const [catalog, setCatalog] = useState<StabilityCatalog | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    getMaterialStability(materialId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
    getStabilityCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null))
  }, [materialId])

  const condition = (code: string, label: string | null) =>
    label ?? catalog?.conditions.find((c) => c.code === code)?.label ?? code

  if (error) return null
  if (!data) return null
  const { known, history, trends } = data
  const rows: [string, string | null][] = [
    ['Problème physico-chimique', known.issue],
    ['Impact', known.impact],
    ['Compatibilité / recombinaison', known.compatibility],
  ]

  return (
    <div className="detail-regulatory">
      <h4>Stabilité</h4>
      <div className="stability-risk-summary" style={{ marginBottom: '0.6rem' }}>
        {known.stable ? (
          <span className="stability-ok">Stable (donnée RADAR)</span>
        ) : (
          <RiskChips risks={known.risks} />
        )}
      </div>
      <dl className="detail-regulatory-grid">
        <div className="detail-regulatory-row">
          <dt>Conditions déclenchantes</dt>
          <dd className={known.triggers ? undefined : 'detail-value-empty'}>
            {known.triggers ? (
              <TriggerChips factors={known.triggerFactors} raw={known.triggers} />
            ) : (
              'Non renseigné'
            )}
          </dd>
        </div>
        {rows.map(([label, value]) => (
          <div key={label} className="detail-regulatory-row">
            <dt>{label}</dt>
            <dd className={value ? undefined : 'detail-value-empty'}>{value ?? 'Non renseigné'}</dd>
          </div>
        ))}
        {known.specs.map((spec) => (
          <div key={spec.parameter} className="detail-regulatory-row">
            <dt>Indice de peroxyde max.</dt>
            <dd>
              &lt; {spec.maxValue} {spec.unit}
              {spec.note && <span className="stability-muted"> — {spec.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <h4 style={{ marginTop: '1rem' }}>Constaté au labo</h4>
      {history.length === 0 ? (
        <p className="stability-muted">
          Aucun test de stabilité sur une formule contenant cette matière pour le moment.
        </p>
      ) : (
        <>
          {trends.length > 0 && (
            <div className="stability-risk-summary" style={{ marginBottom: '0.6rem' }}>
              {trends.map((t) => (
                <span
                  key={t.condition}
                  className={`stability-risk-chip${t.degraded > 0 ? ' stability-risk-heat' : ''}`}
                >
                  {condition(t.condition, null)} : {t.degraded}/{t.tests} dégradé
                  {t.degraded > 1 ? 's' : ''}
                </span>
              ))}
            </div>
          )}
          <table className="detail-recipe-table">
            <thead>
              <tr>
                <th>Formule</th>
                <th>Condition</th>
                <th>Début</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.testId}>
                  <td>{h.formula.name}</td>
                  <td>{condition(h.condition, h.conditionLabel)}</td>
                  <td>{formatDate(h.startDate)}</td>
                  <td>
                    {h.conclusion
                      ? CONCLUSION_LABEL[h.conclusion]
                      : h.worstGrade
                        ? GRADE_LABEL[h.worstGrade]
                        : 'En attente'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
