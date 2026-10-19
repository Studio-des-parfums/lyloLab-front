import { useMemo, useState } from 'react'
import { Search, LayoutGrid, List } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import type { Material } from '../data/materials'
import { dominantDescriptor, displayForDescriptor } from '../data/descriptorIcons'
import MaterialDetail from '../components/MaterialDetail'
import './MaterialsLibrary.css'

type ViewMode = 'grid' | 'list'

export default function MaterialsLibrary() {
  const { catalog, catalogLoading, catalogError } = useFormula()
  const [query, setQuery] = useState('')
  const [descriptorFilter, setDescriptorFilter] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selected, setSelected] = useState<Material | null>(null)

  const descriptorOptions = useMemo(
    () => Object.keys(catalog[0]?.descriptors ?? {}).sort(),
    [catalog],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog
      .filter((m) => (q ? m.name.toLowerCase().includes(q) : true))
      .filter((m) => {
        if (!descriptorFilter) return true
        const value = m.descriptors[descriptorFilter] ?? 0
        return value >= 5
      })
  }, [catalog, query, descriptorFilter])

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
            placeholder="Rechercher une matière première..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

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
                {m.sensation && (
                  <span className="material-card-sensation">{m.sensation}</span>
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
              <th>CAS</th>
              <th>Sensation</th>
            </tr>
          </thead>
          <tbody>
            {results.map((m) => (
              <tr key={m.id} onClick={() => setSelected(m)}>
                <td>{m.name}</td>
                <td>{m.casNumber ?? '—'}</td>
                <td className="library-table-sensation">{m.sensation ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <MaterialDetail material={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
