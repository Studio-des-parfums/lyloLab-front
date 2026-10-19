import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import { dominantDescriptor, displayForDescriptor } from '../data/descriptorIcons'
import MaterialPicker from './MaterialPicker'
import './FavoriteMaterials.css'

export default function FavoriteMaterials() {
  const { favorites, addFavorite, removeFavorite } = useFormula()
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="materials-card">
      <h3 className="materials-title">Matières premières favorites</h3>
      <div className="materials-list">
        {favorites.map((m) => {
          const descriptor = dominantDescriptor(m.descriptors)
          const { icon: Icon, color } = displayForDescriptor(descriptor ?? '')
          return (
            <div key={m.id} className="material-item">
              <div className="material-circle">
                <Icon size={22} color={color} />
                <button
                  type="button"
                  className="material-remove"
                  onClick={() => removeFavorite(m.id)}
                  aria-label={`Retirer ${m.name}`}
                >
                  <X size={10} />
                </button>
              </div>
              <span className="material-name" title={m.name}>
                {m.name}
              </span>
            </div>
          )
        })}
        <div className="material-item">
          <button
            type="button"
            className="material-circle material-add"
            onClick={() => setPickerOpen(true)}
          >
            <Plus size={18} />
          </button>
          <span className="material-name">Ajouter</span>
        </div>
      </div>

      {pickerOpen && (
        <MaterialPicker
          excludeIds={favorites.map((m) => m.id)}
          onSelect={(material) => {
            addFavorite(material)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
