import { useMemo, useState } from 'react'
import { FACETS } from '../../data/facetMapping'
import { materialNature, type Material } from '../../data/materials'
import {
  dominantFacet,
  facetAngle,
  hasProfile,
  inStock,
  neighbours,
  vectorOf,
  wheelPosition,
} from '../../data/olfactiveMath'
import { FacetBars, facetColor, percent } from './shared'

const SIZE = 620
const CENTER = SIZE / 2
const RADIUS = 240

/** Small deterministic offset so materials with the same profile do not overlap. */
function jitter(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return { dx: ((h & 0xff) / 255 - 0.5) * 8, dy: (((h >> 8) & 0xff) / 255 - 0.5) * 8 }
}

export default function MapTab({
  catalog,
  onOpenMaterial,
  onSubstitute,
}: {
  catalog: Material[]
  onOpenMaterial: (m: Material) => void
  onSubstitute: (m: Material) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [origin, setOrigin] = useState<'' | 'natural' | 'synthetic'>('')
  const [stockOnly, setStockOnly] = useState(false)
  const [focus, setFocus] = useState<string | null>(null)
  const [country, setCountry] = useState('')

  const points = useMemo(
    () =>
      catalog.filter(hasProfile).map((m) => {
        const { x, y } = wheelPosition(vectorOf(m))
        const { dx, dy } = jitter(m.id)
        return {
          material: m,
          facet: dominantFacet(m),
          cx: CENTER + x * RADIUS + dx,
          cy: CENTER + y * RADIUS + dy,
        }
      }),
    [catalog],
  )

  const origins = useMemo(
    () => [...new Set(catalog.flatMap((m) => m.originCountries ?? []))].sort((a, b) => a.localeCompare(b)),
    [catalog],
  )

  const q = query.trim().toLowerCase()
  const visible = (m: Material) =>
    (!origin || materialNature(m) === origin) &&
    (!stockOnly || inStock(m)) &&
    (!country || (m.originCountries ?? []).includes(country)) &&
    (!q || m.name.toLowerCase().includes(q) || (m.family ?? '').toLowerCase().includes(q))

  const selected = catalog.find((m) => m.id === selectedId) ?? null
  const close = selected ? neighbours(selected, catalog, () => true, 8) : []
  const closeIds = new Set(close.map((n) => n.material.id))
  const shown = points.filter((p) => visible(p.material))
  const unprofiled = catalog.length - points.length

  return (
    <div className="library-map-layout">
      <div>
        <div className="library-filters">
          <input
            type="search"
            className="library-input"
            placeholder="Rechercher une matière ou une famille…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="library-input"
            value={origin}
            onChange={(e) => setOrigin(e.target.value as typeof origin)}
            aria-label="Origine"
          >
            <option value="">Naturelles et synthétiques</option>
            <option value="natural">Naturelles</option>
            <option value="synthetic">Synthétiques</option>
          </select>
          <select
            className="library-input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label="Origine géographique"
          >
            <option value="">Toutes les origines</option>
            {origins.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <label className="library-check">
            <input type="checkbox" checked={stockOnly} onChange={(e) => setStockOnly(e.target.checked)} />
            En stock
          </label>
        </div>

        <svg
          className="library-wheel"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Roue olfactive des matières premières"
        >
          <circle cx={CENTER} cy={CENTER} r={RADIUS} className="library-wheel-ring" />
          <circle cx={CENTER} cy={CENTER} r={RADIUS / 2} className="library-wheel-ring-inner" />
          {FACETS.map((facet, i) => {
            const a = facetAngle(i)
            const lx = CENTER + Math.cos(a) * (RADIUS + 26)
            const ly = CENTER + Math.sin(a) * (RADIUS + 26)
            return (
              <g key={facet}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={CENTER + Math.cos(a) * RADIUS}
                  y2={CENTER + Math.sin(a) * RADIUS}
                  className="library-wheel-spoke"
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'}
                  dominantBaseline="middle"
                  className={`library-wheel-label${focus === facet ? ' active' : ''}`}
                  style={{ fill: focus === facet ? facetColor(facet) : undefined }}
                  onClick={() => setFocus(focus === facet ? null : facet)}
                >
                  {facet}
                </text>
              </g>
            )
          })}
          {shown.map((p) => {
            const isSelected = p.material.id === selectedId
            const dimmed = (focus && p.facet !== focus) || (selected && !isSelected && !closeIds.has(p.material.id))
            return (
              <circle
                key={p.material.id}
                cx={p.cx}
                cy={p.cy}
                r={isSelected ? 8 : closeIds.has(p.material.id) ? 6 : 4.5}
                fill={facetColor(p.facet)}
                className={`library-point${isSelected ? ' selected' : ''}`}
                opacity={dimmed ? 0.15 : 0.9}
                onClick={() => setSelectedId(isSelected ? null : p.material.id)}
              >
                <title>
                  {p.material.name}
                  {p.facet ? ` — ${p.facet}` : ''}
                </title>
              </circle>
            )
          })}
        </svg>
        <p className="library-muted">
          {shown.length} matières affichées. Chaque point est placé selon ses facettes : plus il est
          près du bord, plus une facette domine ; au centre, le profil est équilibré.
          {unprofiled > 0 ? ` ${unprofiled} matière(s) sans profil ne sont pas placées.` : ''} Cliquez
          sur une facette pour la mettre en évidence.
        </p>
      </div>

      <aside className="library-side">
        {!selected ? (
          <p className="library-muted">Cliquez sur un point pour voir la matière et ses plus proches voisines.</p>
        ) : (
          <>
            <h3>{selected.name}</h3>
            {selected.family && <p className="library-muted">{selected.family}</p>}
            {selected.sensation && <p className="library-sensation">{selected.sensation}</p>}
            <FacetBars material={selected} />
            <div className="library-side-actions">
              <button type="button" className="btn btn-outline" onClick={() => onOpenMaterial(selected)}>
                Ouvrir la fiche
              </button>
              <button type="button" className="btn btn-primary" onClick={() => onSubstitute(selected)}>
                Trouver un substitut
              </button>
            </div>
            <h4>Matières les plus proches</h4>
            <ul className="library-neighbours">
              {close.map((n) => (
                <li key={n.material.id}>
                  <button type="button" onClick={() => setSelectedId(n.material.id)}>
                    <span
                      className="library-dot"
                      style={{ background: facetColor(dominantFacet(n.material)) }}
                    />
                    {n.material.name}
                  </button>
                  <span className="library-score">{percent(n.score)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  )
}
