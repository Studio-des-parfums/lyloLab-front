import { FACETS } from '../../data/facetMapping'
import type { Material } from '../../data/materials'
import { topFacets } from '../../data/olfactiveMath'

/** One colour per facet, spread around the hue circle in wheel order. */
export const facetColor = (facet: string | null) => {
  const i = facet ? FACETS.indexOf(facet as (typeof FACETS)[number]) : -1
  return i < 0 ? '#b8b0a0' : `hsl(${Math.round((i / FACETS.length) * 360)}, 55%, 52%)`
}

export function FacetBars({ material, count = 5 }: { material: Material; count?: number }) {
  const facets = topFacets(material, count)
  if (facets.length === 0) return <p className="library-muted">Profil non renseigné.</p>
  const max = Math.max(...facets.map(([, v]) => v), 1)
  return (
    <ul className="library-bars">
      {facets.map(([facet, value]) => (
        <li key={facet}>
          <span>{facet}</span>
          <span className="library-bar">
            <span style={{ width: `${(value / max) * 100}%`, background: facetColor(facet) }} />
          </span>
          <strong>{Math.round(value * 10) / 10}</strong>
        </li>
      ))}
    </ul>
  )
}

export const percent = (score: number) => `${Math.round(score * 100)} %`
