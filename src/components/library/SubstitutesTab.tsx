import { useEffect, useMemo, useState } from 'react'
import { formatGrams, totalStockGrams, type Material } from '../../data/materials'
import { getMaterialsStability } from '../../data/stabilityApi'
import { hasProfile, inStock, isBanned, neighbours, topFacets } from '../../data/olfactiveMath'
import { parseIfraLimitPercent } from '../../data/ifraLimit'
import { FacetBars, percent } from './shared'

export default function SubstitutesTab({
  catalog,
  initialId,
  onOpenMaterial,
}: {
  catalog: Material[]
  initialId: string | null
  onOpenMaterial: (m: Material) => void
}) {
  const [targetId, setTargetId] = useState(initialId ?? '')
  const [query, setQuery] = useState('')
  const [compliant, setCompliant] = useState(true)
  const [stock, setStock] = useState(false)
  const [stable, setStable] = useState(false)
  const [sameOrigin, setSameOrigin] = useState(false)
  const [atRisk, setAtRisk] = useState<Set<string> | null>(null)

  useEffect(() => {
    if (initialId) setTargetId(initialId)
  }, [initialId])

  useEffect(() => {
    getMaterialsStability()
      .then((list) => setAtRisk(new Set(list.filter((m) => m.risks.length > 0).map((m) => m.materialId))))
      .catch(() => setAtRisk(new Set()))
  }, [])

  const profiled = useMemo(
    () => catalog.filter(hasProfile).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  )
  const options = profiled.filter((m) => !query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase()))
  const target = catalog.find((m) => m.id === targetId) ?? null

  const results = target
    ? neighbours(
        target,
        catalog,
        (m) =>
          (!compliant || !isBanned(m)) &&
          (!stock || inStock(m)) &&
          (!stable || !atRisk?.has(m.id)) &&
          (!sameOrigin || m.nature === target.nature),
        20,
      )
    : []

  const reasons = target
    ? [
        isBanned(target) && 'interdite (IFRA ou Annexe II)',
        !inStock(target) && 'hors stock',
        atRisk?.has(target.id) && 'risque de stabilité connu',
      ].filter(Boolean)
    : []

  return (
    <div className="library-substitutes">
      <div className="library-panel">
        <h3>Matière à remplacer</h3>
        <input
          type="search"
          className="library-input"
          placeholder="Filtrer la liste…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="library-input"
          size={10}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          aria-label="Matière à remplacer"
        >
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <h4>Critères</h4>
        <label className="library-check">
          <input type="checkbox" checked={compliant} onChange={(e) => setCompliant(e.target.checked)} />
          Conformes (non interdites IFRA / Annexe II)
        </label>
        <label className="library-check">
          <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} />
          En stock
        </label>
        <label className="library-check">
          <input type="checkbox" checked={stable} onChange={(e) => setStable(e.target.checked)} />
          Sans risque de stabilité connu
        </label>
        <label className="library-check">
          <input type="checkbox" checked={sameOrigin} onChange={(e) => setSameOrigin(e.target.checked)} />
          Même nature (naturelle / synthétique)
        </label>
      </div>

      <div>
        {!target ? (
          <p className="clients-empty">
            Choisissez une matière : l'outil propose les plus proches olfactivement (24 facettes), en
            tenant compte de la réglementation, du stock et de la stabilité.
          </p>
        ) : (
          <>
            <div className="library-target">
              <div>
                <h3>{target.name}</h3>
                {reasons.length > 0 && (
                  <p className="library-warning">À remplacer : {reasons.join(', ')}.</p>
                )}
                <button type="button" className="btn btn-outline" onClick={() => onOpenMaterial(target)}>
                  Ouvrir la fiche
                </button>
              </div>
              <FacetBars material={target} />
            </div>
            {results.length === 0 ? (
              <p className="clients-empty">Aucune matière ne correspond à ces critères.</p>
            ) : (
              <table className="projects-table library-table">
                <thead>
                  <tr>
                    <th>Matière</th>
                    <th>Proximité</th>
                    <th>Facettes dominantes</th>
                    <th>IFRA Cat.4</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(({ material: m, score }) => {
                    const limit = parseIfraLimitPercent(m.regulatory?.ifraLimit)
                    const grams = totalStockGrams(m)
                    return (
                      <tr
                        key={m.id}
                        tabIndex={0}
                        onClick={() => onOpenMaterial(m)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onOpenMaterial(m)
                        }}
                      >
                        <td>
                          <span className="projects-table-name">{m.name}</span>
                          {atRisk?.has(m.id) && <span className="library-flag">Risque de stabilité</span>}
                          {isBanned(m) && <span className="library-flag library-flag-red">Interdite</span>}
                        </td>
                        <td>
                          <span className="library-proximity">
                            <span style={{ width: percent(score) }} />
                          </span>
                          {percent(score)}
                        </td>
                        <td className="library-muted">
                          {topFacets(m)
                            .map(([f]) => f)
                            .join(', ')}
                        </td>
                        <td>{limit === null ? '—' : limit === 0 ? 'Interdite' : `${limit} %`}</td>
                        <td>{grams ? formatGrams(grams) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
