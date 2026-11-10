import { useEffect, useMemo, useState } from 'react'
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { FACETS } from '../../data/facetMapping'
import { formatGrams, materialNature, totalStockGrams, type Material } from '../../data/materials'
import { getCountries, type Country } from '../../data/libraryApi'
import { dominantFacet, inStock, topFacets } from '../../data/olfactiveMath'
import { facetColor } from './shared'

const WIDTH = 960
const HEIGHT = 500

type CountryFeature = Feature<Geometry, { name: string }> & { id?: string | number }

/** Sequential fill from light sand to deep amber, on a log scale of the count. */
function fill(count: number, max: number) {
  if (count === 0) return '#f1eee7'
  const t = max <= 1 ? 1 : Math.log(count) / Math.log(max)
  const light = 86 - t * 50
  return `hsl(32, ${45 + t * 25}%, ${light}%)`
}

export default function WorldTab({
  catalog,
  onOpenMaterial,
}: {
  catalog: Material[]
  onOpenMaterial: (m: Material) => void
}) {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [origin, setOrigin] = useState<'' | 'natural' | 'synthetic'>('')
  const [stockOnly, setStockOnly] = useState(false)
  const [facet, setFacet] = useState('')

  useEffect(() => {
    // The detailed map (small islands such as the Comoros) is loaded on demand.
    import('world-atlas/countries-50m.json')
      .then((mod) => {
        const topology = (mod.default ?? mod) as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
        const collection = feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>
        setFeatures(collection.features as CountryFeature[])
      })
      .catch(() => setError('Impossible de charger le fond de carte.'))
    getCountries()
      .then(setCountries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
  }, [])

  const filtered = useMemo(
    () =>
      catalog.filter(
        (m) =>
          (m.originCountries?.length ?? 0) > 0 &&
          (!origin || materialNature(m) === origin) &&
          (!stockOnly || inStock(m)) &&
          (!facet || dominantFacet(m) === facet),
      ),
    [catalog, origin, stockOnly, facet],
  )

  // Materials by origin name (a material with several origins counts for each).
  const byPlace = useMemo(() => {
    const map = new Map<string, Material[]>()
    for (const m of filtered) {
      for (const place of m.originCountries ?? []) map.set(place, [...(map.get(place) ?? []), m])
    }
    return map
  }, [filtered])

  const byIso = useMemo(
    () => new Map(countries.filter((c) => c.isoNumeric).map((c) => [c.isoNumeric!, c])),
    [countries],
  )
  const max = Math.max(1, ...[...byPlace.values()].map((list) => list.length))

  const path = useMemo(() => {
    if (!features) return null
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], {
      type: 'FeatureCollection',
      features,
    } as GeoPermissibleObjects)
    return geoPath(projection)
  }, [features])

  const regions = countries
    .filter((c) => c.kind === 'region' && byPlace.has(c.name))
    .map((c) => ({ name: c.name, count: byPlace.get(c.name)!.length }))
  const continents = new Map<string, number>()
  for (const c of countries) {
    const n = byPlace.get(c.name)?.length ?? 0
    if (n) continents.set(c.continent, (continents.get(c.continent) ?? 0) + n)
  }
  const ranking = countries
    .filter((c) => c.kind === 'country' && byPlace.has(c.name))
    .map((c) => ({ name: c.name, count: byPlace.get(c.name)!.length }))
    .sort((a, b) => b.count - a.count)

  const list = selected ? (byPlace.get(selected) ?? []) : []
  const label = hovered ?? selected
  const withoutOrigin = catalog.filter((m) => !m.originCountries?.length).length

  return (
    <div>
      <div className="library-filters">
        <select className="library-input" value={origin} onChange={(e) => setOrigin(e.target.value as typeof origin)} aria-label="Nature">
          <option value="">Naturelles et synthétiques</option>
          <option value="natural">Naturelles</option>
          <option value="synthetic">Synthétiques</option>
        </select>
        <select className="library-input" value={facet} onChange={(e) => setFacet(e.target.value)} aria-label="Facette dominante">
          <option value="">Toutes les facettes</option>
          {FACETS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <label className="library-check">
          <input type="checkbox" checked={stockOnly} onChange={(e) => setStockOnly(e.target.checked)} />
          En stock
        </label>
        <span className="library-muted">
          {filtered.length} matière{filtered.length > 1 ? 's' : ''} avec une origine
          {withoutOrigin ? ` · ${withoutOrigin} sans origine renseignée` : ''}
        </span>
      </div>

      {error && <p className="clients-status clients-status-error">{error}</p>}

      {catalog.length > 0 && catalog.every((m) => !m.originCountries?.length) && (
        <p className="library-notice">
          Aucune matière n'a encore d'origine en base. Lancez l'import dans le backend :{' '}
          <code>npx prisma db push</code> puis <code>npm run seed:origins</code>, redémarrez le
          backend et rechargez la page. Vous pouvez aussi renseigner l'origine depuis la fiche d'une
          matière.
        </p>
      )}
      {catalog.length > 0 && countries.length === 0 && !error && (
        <p className="library-notice">
          La table des pays est vide : l'import <code>npm run seed:origins</code> n'a pas été lancé.
        </p>
      )}

      <div className="library-world">
        <div className="library-world-map">
          {!path || !features ? (
            <p className="clients-status">Chargement de la carte…</p>
          ) : (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Origine géographique des matières">
              {features.map((f) => {
                const country = byIso.get(String(f.id).padStart(3, '0'))
                const count = country ? (byPlace.get(country.name)?.length ?? 0) : 0
                const d = path(f)
                if (!d) return null
                const name = country?.name ?? f.properties.name
                return (
                  <path
                    key={`${f.id}-${f.properties.name}`}
                    d={d}
                    fill={fill(count, max)}
                    className={`library-country${count ? ' has-materials' : ''}${selected && country?.name === selected ? ' selected' : ''}`}
                    onMouseEnter={() => setHovered(count ? name : null)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => count && country && setSelected(selected === country.name ? null : country.name)}
                  >
                    <title>{count ? `${name} : ${count} matière${count > 1 ? 's' : ''}` : name}</title>
                  </path>
                )
              })}
            </svg>
          )}
          <div className="library-world-legend">
            <span>Moins</span>
            {[1, Math.ceil(max / 4), Math.ceil(max / 2), max].map((n, i) => (
              <span key={i} className="library-world-swatch" style={{ background: fill(n, max) }} />
            ))}
            <span>Plus de matières</span>
            {label && (
              <strong className="library-world-hover">
                {label} · {byPlace.get(label)?.length ?? 0}
              </strong>
            )}
          </div>
        </div>

        <aside className="library-side">
          {selected ? (
            <>
              <div className="library-side-head">
                <h3>{selected}</h3>
                <button type="button" className="library-link" onClick={() => setSelected(null)}>
                  Tout voir
                </button>
              </div>
              <ul className="library-origin-list">
                {list
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((m) => {
                    const grams = totalStockGrams(m)
                    return (
                      <li key={m.id}>
                        <button type="button" onClick={() => onOpenMaterial(m)}>
                          <span className="library-dot" style={{ background: facetColor(dominantFacet(m)) }} />
                          <span>
                            <strong>{m.name}</strong>
                            <span className="library-muted">
                              {topFacets(m)
                                .map(([f]) => f)
                                .join(', ') || 'Profil non renseigné'}
                              {grams ? ` · ${formatGrams(grams)}` : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </>
          ) : (
            <>
              <h3>Principales origines</h3>
              <ul className="library-ranking">
                {ranking.slice(0, 12).map((r) => (
                  <li key={r.name}>
                    <button type="button" onClick={() => setSelected(r.name)}>
                      {r.name}
                    </button>
                    <span className="library-bar">
                      <span style={{ width: `${(r.count / max) * 100}%`, background: fill(r.count, max) }} />
                    </span>
                    <strong>{r.count}</strong>
                  </li>
                ))}
              </ul>
              {continents.size > 0 && (
                <>
                  <h4>Par continent</h4>
                  <ul className="library-chips">
                    {[...continents.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .map(([c, n]) => (
                        <li key={c} className="library-tag">
                          {c} · {n}
                        </li>
                      ))}
                  </ul>
                </>
              )}
              {regions.length > 0 && (
                <>
                  <h4>Origines régionales</h4>
                  <p className="library-muted">Indiquées sans pays précis, donc absentes de la carte.</p>
                  <ul className="library-chips">
                    {regions.map((r) => (
                      <li key={r.name}>
                        <button type="button" onClick={() => setSelected(r.name)}>
                          {r.name} <strong>{r.count}</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </aside>
      </div>
      <p className="library-muted">
        Origines importées du fichier de rangement (feuilles Stock MP - Complexes, Biologiques et
        Commandes), modifiables sur la fiche de chaque matière.
      </p>
    </div>
  )
}
