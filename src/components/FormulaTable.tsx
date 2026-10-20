import { useFormula } from '../context/FormulaContext'
import { computeFormulaShares } from '../data/formulaEngine'
import { evaluateFormulaCompliance, type ComplianceLevel } from '../data/ifraCompliance'
import './FormulaTable.css'

const STATUS_ICON: Record<ComplianceLevel, string> = {
  ok: '✓',
  warning: '⚠',
  violation: '⛔',
}

export default function FormulaTable() {
  const { favorites, facets, adjustments, catalog } = useFormula()
  const shares = computeFormulaShares(favorites, facets, adjustments, catalog)
  const total = shares.reduce((sum, s) => sum + s.percent, 0)
  const compliance = evaluateFormulaCompliance(shares)

  return (
    <div className="formula-table-wrapper">
      <h3 className="formula-table-title">Formule indicative</h3>
      {shares.length === 0 ? (
        <p className="formula-table-empty">
          Ajoutez des matières premières favorites pour générer la formule.
        </p>
      ) : (
        <>
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
                <th>Conformité</th>
              </tr>
            </thead>
            <tbody>
              {compliance.materials.map(({ share, level, messages }) => (
                <tr key={share.material.id} className={`formula-row-${level}`}>
                  <td>{share.material.name}</td>
                  <td>{share.percent.toFixed(1)}</td>
                  <td>
                    <span
                      className={`formula-status formula-status-${level}`}
                      title={messages.join(' ') || 'Aucune alerte connue.'}
                    >
                      {STATUS_ICON[level]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{total.toFixed(1)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  )
}
