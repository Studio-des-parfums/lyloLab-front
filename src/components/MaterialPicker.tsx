import { useMemo, useState } from 'react'
import { X, Search } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import { dominantDescriptor } from '../data/descriptorIcons'
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
    const q = normalizeSearch(query)
    return catalog
      .filter((m) => !excludeIds.includes(m.id))
      .filter((m) => (q ? searchableText(m).includes(q) : true))
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
              placeholder="Rechercher par nom, fournisseur ou note dominante..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="button" className="picker-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="picker-list">
          <p className="picker-count">
            {results.length} matière{results.length > 1 ? 's' : ''}
          </p>
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

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function searchableText(material: Material): string {
  return normalizeSearch(
    [
      material.name,
      material.casNumber,
      dominantDescriptor(material.descriptors),
      ...material.stocks.flatMap((stock) => [
        stock.supplier,
        stock.producer,
        stock.label,
      ]),
    ]
      .filter(Boolean)
      .join(' | '),
  )
}
