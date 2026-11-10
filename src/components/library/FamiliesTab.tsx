import { useEffect, useMemo, useState } from 'react'
import type { Material } from '../../data/materials'
import { getFamilies, type OlfactiveFamily } from '../../data/libraryApi'
import { hasProfile, matchFacets } from '../../data/olfactiveMath'
import { percent } from './shared'

export default function FamiliesTab({
  catalog,
  onOpenMaterial,
}: {
  catalog: Material[]
  onOpenMaterial: (m: Material) => void
}) {
  const [families, setFamilies] = useState<OlfactiveFamily[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>('A')

  useEffect(() => {
    getFamilies()
      .then(setFamilies)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
  }, [])

  const all = useMemo(() => (families ?? []).flatMap((f) => [f, ...f.subfamilies]), [families])
  const current = all.find((f) => f.code === selected) ?? null
  const parent = current?.parentCode ? all.find((f) => f.code === current.parentCode) : current

  const close = current
    ? catalog
        .filter(hasProfile)
        .map((m) => ({ m, score: matchFacets(m, current.facets) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
    : []
  if (error) return <p className="clients-status clients-status-error">{error}</p>
  if (!families) return <p className="clients-status">Chargement...</p>
  if (families.length === 0) {
    return (
      <p className="clients-empty">
        La classification n'est pas encore en base : lancez <code>npm run seed:library</code> dans le
        backend.
      </p>
    )
  }

  return (
    <div className="library-families">
      <nav className="library-panel library-family-tree" aria-label="Familles olfactives">
        {families.map((family) => (
          <div key={family.code}>
            <button
              type="button"
              className={`library-family${selected === family.code ? ' active' : ''}`}
              onClick={() => setSelected(family.code)}
            >
              <strong>{family.code}</strong> {family.name}
            </button>
            {parent?.code === family.code &&
              family.subfamilies.map((sub) => (
                <button
                  key={sub.code}
                  type="button"
                  className={`library-subfamily${selected === sub.code ? ' active' : ''}`}
                  onClick={() => setSelected(sub.code)}
                >
                  {sub.code} {sub.name}
                </button>
              ))}
          </div>
        ))}
      </nav>

      {current && (
        <div>
          <h3 className="library-family-title">
            {current.code} — {current.name}
          </h3>
          {parent && parent !== current && <p className="library-muted">Famille {parent.name}</p>}
          {(current.description ?? parent?.description) && (
            <p>{current.description ?? parent?.description}</p>
          )}
          {current.sourceUrl && (
            <p className="library-muted">
              Classification de la{' '}
              <a href={current.sourceUrl} target="_blank" rel="noreferrer">
                Société Française des Parfumeurs
              </a>
              .
            </p>
          )}

          <h4>Profil indicatif</h4>
          <ul className="library-chips">
            {current.facets.map((f) => (
              <li key={f} className="library-tag">
                {f}
              </li>
            ))}
          </ul>
          <p className="library-muted">
            Facettes déduites du nom de la famille (hors classification SFP), utilisées pour suggérer
            les matières ci-dessous.
          </p>

          <h4>Matières du catalogue les plus proches</h4>
          <table className="projects-table library-table">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Correspondance</th>
                <th>Famille (fiche)</th>
              </tr>
            </thead>
            <tbody>
              {close.map(({ m, score }) => (
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
                  </td>
                  <td>{percent(score)}</td>
                  <td className="library-muted">{m.family ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}
    </div>
  )
}
