import { useEffect, useState } from 'react'
import { useFormula } from '../context/FormulaContext'
import { computeFormulaShares } from '../data/formulaEngine'
import {
  getRisksForLines,
  getStabilityCatalog,
  type FormulaRiskReport,
  type StabilityCatalog,
} from '../data/stabilityApi'
import StabilityRiskPanel from './StabilityRiskPanel'

/** Formula builder card: known stability risks of the open formula and the tests to run. */
export default function StabilityCard() {
  const { favorites, facets, adjustments, catalog } = useFormula()
  const shares = computeFormulaShares(favorites, facets, adjustments, catalog)
  const lines = shares.map((s) => ({
    materialId: s.material.id,
    percent: Math.round(s.percent * 100) / 100,
  }))
  // Re-analyse only when the materials or their rounded percentages change.
  const key = lines.map((l) => `${l.materialId}:${l.percent}`).join('|')

  const [report, setReport] = useState<FormulaRiskReport | null>(null)
  const [conditions, setConditions] = useState<StabilityCatalog | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getStabilityCatalog()
      .then(setConditions)
      .catch(() => setConditions(null))
  }, [])

  useEffect(() => {
    if (lines.length === 0) {
      setReport(null)
      return
    }
    const timer = setTimeout(() => {
      getRisksForLines(lines)
        .then((r) => {
          setReport(r)
          setError(null)
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div>
      <h3 className="card-title">Stabilité</h3>
      <p className="card-subtitle">
        Risques connus des matières de la formule et tests de vieillissement conseillés. Lancez-les
        depuis « Tests & stabilité » une fois la formule enregistrée.
      </p>
      {lines.length === 0 ? (
        <p className="compliance-empty">Ajoutez des matières premières pour analyser la stabilité.</p>
      ) : error ? (
        <p className="clients-status clients-status-error">{error}</p>
      ) : !report ? (
        <p className="compliance-empty">Analyse…</p>
      ) : (
        <StabilityRiskPanel report={report} catalog={conditions} compact />
      )}
    </div>
  )
}
