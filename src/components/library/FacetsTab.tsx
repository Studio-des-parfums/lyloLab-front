import { useEffect, useState } from 'react'
import { Pencil, RotateCcw } from 'lucide-react'
import type { Material } from '../../data/materials'
import {
  getFacetDefinitions,
  resetFacetDefinition,
  updateFacetDefinition,
  type FacetDefinition,
} from '../../data/libraryApi'
import { facetColor } from './shared'

export default function FacetsTab({
  catalog,
  onOpenMaterial,
}: {
  catalog: Material[]
  onOpenMaterial: (m: Material) => void
}) {
  const [facets, setFacets] = useState<FacetDefinition[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ description: '', examples: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getFacetDefinitions()
      .then(setFacets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
  }, [])

  /** Materials of the catalog that best embody a facet. */
  const references = (facet: string) =>
    catalog
      .map((m) => ({ m, v: Number(m.descriptors?.[facet]) || 0 }))
      .filter(({ v }) => v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 6)

  async function save(facet: string) {
    setBusy(true)
    try {
      setFacets(await updateFacetDefinition(facet, form))
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="clients-status clients-status-error">{error}</p>
  if (!facets) return <p className="clients-status">Chargement...</p>

  return (
    <>
      <p className="library-muted">
        Le vocabulaire commun de l'équipe : une définition par facette (modifiable) et les matières de
        votre catalogue qui l'incarnent le mieux, classées par note.
      </p>
      <div className="library-facets">
        {facets.map((f) => (
          <article key={f.facet} className="library-facet" style={{ borderTopColor: facetColor(f.facet) }}>
            <header>
              <h3>{f.facet}</h3>
              {editing !== f.facet && (
                <span className="library-facet-actions">
                  {f.customized && (
                    <button
                      type="button"
                      title="Rétablir la définition par défaut"
                      aria-label={`Rétablir la définition de ${f.facet}`}
                      onClick={async () => setFacets(await resetFacetDefinition(f.facet))}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Modifier"
                    aria-label={`Modifier ${f.facet}`}
                    onClick={() => {
                      setForm({ description: f.description ?? '', examples: f.examples ?? '' })
                      setEditing(f.facet)
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                </span>
              )}
            </header>
            {editing === f.facet ? (
              <div className="library-facet-form">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Exemples d'odeurs ou de matières"
                  value={form.examples}
                  onChange={(e) => setForm({ ...form, examples: e.target.value })}
                />
                <div className="client-detail-form-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !form.description.trim()}
                    onClick={() => save(f.facet)}
                  >
                    Enregistrer
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>{f.description ?? <span className="library-muted">Pas encore de définition.</span>}</p>
                {f.examples && <p className="library-muted">Ex. : {f.examples}</p>}
                {f.customized && <span className="library-tag">Définition de l'équipe</span>}
              </>
            )}
            <h4>Références du catalogue</h4>
            <ul className="library-chips">
              {references(f.facet).map(({ m, v }) => (
                <li key={m.id}>
                  <button type="button" onClick={() => onOpenMaterial(m)}>
                    {m.name} <strong>{Math.round(v * 10) / 10}</strong>
                  </button>
                </li>
              ))}
              {references(f.facet).length === 0 && <li className="library-muted">Aucune matière notée.</li>}
            </ul>
          </article>
        ))}
      </div>
    </>
  )
}
