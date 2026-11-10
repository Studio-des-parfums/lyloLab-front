import { useState } from 'react'
import { useFormula } from '../context/FormulaContext'
import type { Material } from '../data/materials'
import MaterialDetail from '../components/MaterialDetail'
import MapTab from '../components/library/MapTab'
import WorldTab from '../components/library/WorldTab'
import SubstitutesTab from '../components/library/SubstitutesTab'
import FacetsTab from '../components/library/FacetsTab'
import FamiliesTab from '../components/library/FamiliesTab'
import './ProjectsPage.css'
import './ClientsPage.css'
import './LibraryPage.css'

type Tab = 'map' | 'world' | 'substitutes' | 'facets' | 'families'

const TABS: [Tab, string][] = [
  ['map', 'Carte olfactive'],
  ['world', 'Carte du monde'],
  ['substitutes', 'Substitutions'],
  ['facets', 'Facettes'],
  ['families', 'Familles'],
]

export default function LibraryPage({ onGoToFormula }: { onGoToFormula: (formulaId: string) => void }) {
  const { catalog } = useFormula()
  const [tab, setTab] = useState<Tab>('map')
  const [selected, setSelected] = useState<Material | null>(null)
  const [substituteId, setSubstituteId] = useState<string | null>(null)

  return (
    <div className="clients-page library-page">
      <div className="clients-header">
        <div>
          <h1>Bibliothèque olfactive</h1>
          <p>
            Explorer vos matières par leurs odeurs et leurs origines, trouver des substitutions et
            partager un vocabulaire commun.
          </p>
        </div>
      </div>

      <div className="library-tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`library-tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'map' && (
        <MapTab
          catalog={catalog}
          onOpenMaterial={setSelected}
          onSubstitute={(m) => {
            setSubstituteId(m.id)
            setTab('substitutes')
          }}
        />
      )}
      {tab === 'world' && <WorldTab catalog={catalog} onOpenMaterial={setSelected} />}
      {tab === 'substitutes' && (
        <SubstitutesTab catalog={catalog} initialId={substituteId} onOpenMaterial={setSelected} />
      )}
      {tab === 'facets' && <FacetsTab catalog={catalog} onOpenMaterial={setSelected} />}
      {tab === 'families' && <FamiliesTab catalog={catalog} onOpenMaterial={setSelected} />}

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
