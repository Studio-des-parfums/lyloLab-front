import type {
  FormulaRiskReport,
  RiskType,
  StabilityCatalog,
  TriggerFactor,
} from '../data/stabilityApi'
import './StabilityRiskPanel.css'

export const RISK_LABEL: Record<RiskType, string> = {
  oxidation: 'Oxydation',
  light: 'Lumière / UV',
  heat: 'Chaleur',
  ph: 'pH extrême',
  hydrolysis: 'Hydrolyse / humidité',
  discoloration: 'Décoloration',
}

export function RiskChips({ risks }: { risks: RiskType[] }) {
  if (risks.length === 0) return <span className="stability-muted">—</span>
  return (
    <span className="stability-risk-chips">
      {risks.map((risk) => (
        <span key={risk} className={`stability-risk-chip stability-risk-${risk}`}>
          {RISK_LABEL[risk]}
        </span>
      ))}
    </span>
  )
}

/** Triggering conditions as clean chips; the original text stays in the tooltip. */
export function TriggerChips({ factors, raw }: { factors: TriggerFactor[]; raw: string | null }) {
  if (factors.length === 0) return <span className="stability-muted">{raw ?? '—'}</span>
  return (
    <span className="stability-trigger-chips" title={raw ?? undefined}>
      {factors.map((f) => (
        <span key={`${f.kind}-${f.label}`} className={`stability-trigger stability-trigger-${f.kind}`}>
          {f.label}
        </span>
      ))}
    </span>
  )
}

/** Known stability risks of a formula's materials and the tests they call for. */
export default function StabilityRiskPanel({
  report,
  catalog,
  compact,
}: {
  report: FormulaRiskReport
  catalog: StabilityCatalog | null
  compact?: boolean
}) {
  const conditionLabel = (code: string) =>
    catalog?.conditions.find((c) => c.code === code)?.label ?? code
  const atRisk = report.materials.filter((m) => m.risks.length > 0 || m.specs.length > 0)
  const counts = Object.entries(report.riskCounts) as [RiskType, number][]

  return (
    <div className="stability-risk-panel">
      <div className="stability-risk-summary">
        {counts.length === 0 ? (
          <span className="stability-ok">Aucun risque de stabilité connu pour ces matières.</span>
        ) : (
          counts.map(([risk, count]) => (
            <span key={risk} className={`stability-risk-chip stability-risk-${risk}`}>
              {RISK_LABEL[risk]} · {count}
            </span>
          ))
        )}
        {report.unknownCount > 0 && (
          <span className="stability-muted">
            {report.unknownCount} matière{report.unknownCount > 1 ? 's' : ''} sans donnée de stabilité
          </span>
        )}
      </div>

      <h4 className="stability-risk-title">Tests conseillés</h4>
      <ul className="stability-recommended">
        {report.recommended.map((r) => (
          <li key={r.condition}>
            <strong>{conditionLabel(r.condition)}</strong>
            <span>{r.reasons.join(' · ')}</span>
          </li>
        ))}
      </ul>

      {atRisk.length > 0 && (
        <>
          <h4 className="stability-risk-title">Matières sensibles ({atRisk.length})</h4>
          <div className="stability-table-wrapper">
            <table className="projects-table stability-table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>%</th>
                  <th>Risques</th>
                  {!compact && <th>Conditions déclenchantes</th>}
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((m) => (
                  <tr key={m.materialId} className="stability-row-static">
                    <td>
                      <span className="projects-table-name">{m.material}</span>
                      {m.specs.map((spec) => (
                        <span key={spec.parameter} className="stability-spec">
                          Indice de peroxyde &lt; {spec.maxValue} {spec.unit}
                        </span>
                      ))}
                    </td>
                    <td className="stability-num">
                      {m.percent !== null ? m.percent.toFixed(2) : '—'}
                    </td>
                    <td>
                      <RiskChips risks={m.risks} />
                    </td>
                    {!compact && (
                      <td>
                        <TriggerChips factors={m.triggerFactors} raw={m.triggers} />
                      </td>
                    )}
                    <td className="stability-muted">{m.impact ?? m.issue ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="stability-source">
        Données : fichier RADAR (problème physico-chimique, conditions, impact) et spécifications
        officielles (règlement (UE) 2023/1545).
      </p>
    </div>
  )
}
