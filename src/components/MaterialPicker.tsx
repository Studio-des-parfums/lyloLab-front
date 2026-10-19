import { useMemo, useState } from 'react'
import { X, Search } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import type { Material } from '../data/materials'
import './MaterialPicker.css'

interface MaterialPickerProps {
  excludeIds: string[]
  onSelect: (material: Material) => void
  onClose: () => void
}

export default function MaterialPicker({
  excludeIds,
  onSelect,
  onClose,
}: MaterialPickerProps) {
  const { catalog } = useFormula()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog
      .filter((m) => !excludeIds.includes(m.id))
      .filter((m) => (q ? m.name.toLowerCase().includes(q) : true))
      .slice(0, 60)
  }, [query, excludeIds, catalog])

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <div className="picker-search">
            <Search size={16} />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher une matière première..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="button" className="picker-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="picker-list">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              className="picker-item"
              onClick={() => onSelect(m)}
            >
              <span className="picker-item-name">{m.name}</span>
              {m.sensation && (
                <span className="picker-item-sensation">{m.sensation}</span>
              )}
            </button>
          ))}
          {results.length === 0 && (
            <p className="picker-empty">Aucune matière trouvée.</p>
          )}
        </div>
      </div>
    </div>
  )
}
