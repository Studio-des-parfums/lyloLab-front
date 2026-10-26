import { useMemo, useState } from 'react'
import { Search, LayoutGrid, List, FlaskConical, Leaf } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import {
  distinctValues,
  formatGrams,
  materialNature,
  totalStockGrams,
  type Material,
  type MaterialOrigin,
} from '../data/materials'
import { dominantDescriptor, displayForDescriptor } from '../data/descriptorIcons'
import MaterialDetail from '../components/MaterialDetail'
import './MaterialsLibrary.css'

type ViewMode = 'grid' | 'list'

interface MaterialsLibraryProps {
  onGoToFormula: (formulaId: string) => void
}

export default function MaterialsLibrary({ onGoToFormula }: MaterialsLibraryProps) {
  const { catalog, catalogLoading, catalogError } = useFormula()
  const [query, setQuery] = useState('')
  const [descriptorFilter, setDescriptorFilter] = useState('')
  const [natureFilter, setNatureFilter] = useState<'' | MaterialOrigin>('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selected, setSelected] = useState<Material | null>(null)

  const descriptorOptions = useMemo(
    () => [...new Set(catalog.flatMap((m) => Object.keys(m.descriptors)))].sort(),
    [catalog],
  )

  const supplierOptions = useMemo(
    () =>
      distinctValues(
        catalog.flatMap((m) => m.stocks.flatMap((s) => [s.supplier, s.producer])),
      ).sort((a, b) =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' }),
      ),
    [catalog],
  )

  const results = useMemo(() => {
    const q = normalizeSearch(query)
    const supplier = supplierFilter.toLowerCase()
    return catalog
      .filter((m) => (q ? searchableText(m).includes(q) : true))
      .filter((m) =>
        supplier
          ? m.stocks.some((s) =>
              [s.supplier, s.producer].some((name) => name?.trim().toLowerCase() === supplier),
            )
          : true,
      )
      .filter((m) => {
        if (!descriptorFilter) return true
        const value = m.descriptors[descriptorFilter] ?? 0
        return value >= 5
      })
      .filter((m) => (natureFilter ? materialNature(m) === natureFilter : true))
  }, [catalog, query, supplierFilter, descriptorFilter, natureFilter])

  if (catalogLoading) {
    return <p className="library-status">Chargement des matières premières...</p>
  }

  if (catalogError) {
    return (
      <p className="library-status library-status-error">
        Impossible de charger les matières premières : {catalogError}.
      </p>
    )
  }

  return (
    <div className="library">
      <div className="library-header">
        <div>
          <h1 className="library-title">Matières premières</h1>
          <p className="library-subtitle">
            {results.length} matière{results.length > 1 ? 's' : ''} sur{' '}
            {catalog.length} au total
          </p>
        </div>

        <div className="library-view-toggle">
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            aria-label="Vue grille"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            aria-label="Vue liste"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="library-controls">
        <div className="library-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom, CAS ou fournisseur..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          className="library-filter"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
        >
          <option value="">Tous les fournisseurs</option>
          {supplierOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className="library-filter"
          value={descriptorFilter}
          onChange={(e) => setDescriptorFilter(e.target.value)}
        >
          <option value="">Tous les descripteurs</option>
          {descriptorOptions.map((d) => (
            <option key={d} value={d}>
              {d} dominant
            </option>
          ))}
        </select>

        <select
          className="library-filter"
          value={natureFilter}
          onChange={(e) => setNatureFilter(e.target.value as '' | MaterialOrigin)}
        >
          <option value="">Tous les types de note</option>
          <option value="natural">Naturelle</option>
          <option value="synthetic">Synthétique</option>
        </select>
      </div>

      {results.length === 0 ? (
        <p className="library-empty">Aucune matière ne correspond à votre recherche.</p>
      ) : viewMode === 'grid' ? (
        <div className="library-grid">
          {results.map((m) => {
            const descriptor = dominantDescriptor(m.descriptors)
            const { icon: Icon, color } = displayForDescriptor(descriptor ?? '')
            return (
              <button
                key={m.id}
                type="button"
                className="material-card"
                onClick={() => setSelected(m)}
              >
                <div className="material-card-avatar">
                  <Icon size={22} color={color} />
                </div>
                <span className="material-card-name">{m.name}</span>
                <MaterialOriginTag origin={materialNature(m)} />
                {m.sensation && (
                  <span className="material-card-sensation">{m.sensation}</span>
                )}
                {m.stocks.length > 0 && (
                  <span className="material-card-stock">
                    {distinctValues(m.stocks.map((s) => s.supplier)).join(', ') || 'Fournisseur inconnu'}
                    {' · '}
                    <StockSummary material={m} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <table className="library-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>CAS</th>
              <th>Fournisseur</th>
              <th>Emplacement</th>
              <th>Stock</th>
              <th>Sensation</th>
            </tr>
          </thead>
          <tbody>
            {results.map((m) => (
              <tr key={m.id} onClick={() => setSelected(m)}>
                <td>{m.name}</td>
                <td>
                  <MaterialOriginTag origin={materialNature(m)} />
                </td>
                <td>{m.casNumber ?? '—'}</td>
                <td>{distinctValues(m.stocks.map((s) => s.supplier)).join(', ') || '—'}</td>
                <td>{distinctValues(m.stocks.map((s) => s.location)).join(', ') || '—'}</td>
                <td className="library-table-stock">
                  <StockSummary material={m} />
                </td>
                <td className="library-table-sensation">{m.sensation ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <MaterialDetail
          material={selected}
          onClose={() => setSelected(null)}
          onGoToFormula={(formulaId) => {
            setSelected(null)
            onGoToFormula(formulaId)
          }}
        />
      )}
    </div>
  )
}

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// Name, CAS, suppliers and the names used in the inventory file (e.g.
// "Ambrox Super" is filed under Ambroxan).
function searchableText(m: Material): string {
  return normalizeSearch(
    [m.name, m.casNumber, ...m.stocks.flatMap((s) => [s.supplier, s.producer, s.label])]
      .filter(Boolean)
      .join(' | '),
  )
}

function StockSummary({ material }: { material: Material }) {
  if (material.stocks.length === 0) return <>—</>
  const total = totalStockGrams(material)
  const notes = distinctValues(material.stocks.map((s) => s.stockNote))
  const parts = [total !== null ? formatGrams(total) : null, ...notes].filter(Boolean)
  return <>{parts.length > 0 ? parts.join(' · ') : 'Non renseigné'}</>
}

function MaterialOriginTag({ origin }: { origin: MaterialOrigin }) {
  return origin === 'synthetic' ? (
    <span className="material-origin-tag material-origin-synthetic">
      <FlaskConical size={11} /> Synthétique
    </span>
  ) : (
    <span className="material-origin-tag material-origin-natural">
      <Leaf size={11} /> Naturelle
    </span>
  )
}
