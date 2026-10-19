import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { FACETS, type Facet } from '../data/facetMapping'
import { ADJUSTMENTS, type AdjustmentKey } from '../data/adjustmentMapping'
import { fetchMaterials, type Material } from '../data/materials'
import { averageFacetsFromMaterials, computeFormulaShares } from '../data/formulaEngine'
import { createFormula } from '../data/formulasApi'

const DEFAULT_ADJUSTMENTS: Record<AdjustmentKey, number> = {
  'Diffusion / Sillage': 70,
  Tenue: 80,
  Puissance: 60,
  Douceur: 50,
  Originalité: 65,
}

const DEFAULT_FORMULA_NAME = 'Mon Accord sur Mesure'

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

interface FormulaContextValue {
  catalog: Material[]
  catalogLoading: boolean
  catalogError: string | null

  favorites: Material[]
  addFavorite: (material: Material) => void
  removeFavorite: (id: string) => void

  facets: Record<Facet, number>
  setFacetValue: (facet: Facet, value: number) => void
  resetFacetsToFavorites: () => void

  adjustments: Record<AdjustmentKey, number>
  setAdjustmentValue: (key: AdjustmentKey, value: number) => void

  formulaName: string
  setFormulaName: (name: string) => void

  saveStatus: SaveStatus
  saveError: string | null
  saveFormula: () => Promise<void>
}

const FormulaContext = createContext<FormulaContextValue | null>(null)

export function FormulaProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Material[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [favorites, setFavorites] = useState<Material[]>([])
  const [facets, setFacets] = useState<Record<Facet, number>>(() =>
    averageFacetsFromMaterials([]),
  )
  const [facetsTouched, setFacetsTouched] = useState(false)

  const [adjustments, setAdjustments] =
    useState<Record<AdjustmentKey, number>>(DEFAULT_ADJUSTMENTS)

  const [formulaName, setFormulaName] = useState(DEFAULT_FORMULA_NAME)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchMaterials()
      .then((materials) => {
        if (cancelled) return
        setCatalog(materials)
      })
      .catch((err) => {
        if (!cancelled) setCatalogError(err.message)
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function addFavorite(material: Material) {
    setFavorites((prev) => {
      const next = [...prev, material]
      if (!facetsTouched) setFacets(averageFacetsFromMaterials(next))
      return next
    })
  }

  function removeFavorite(id: string) {
    setFavorites((prev) => {
      const next = prev.filter((m) => m.id !== id)
      if (!facetsTouched) setFacets(averageFacetsFromMaterials(next))
      return next
    })
  }

  function setFacetValue(facet: Facet, value: number) {
    setFacetsTouched(true)
    setFacets((prev) => ({ ...prev, [facet]: value }))
  }

  function resetFacetsToFavorites() {
    setFacetsTouched(false)
    setFacets(averageFacetsFromMaterials(favorites))
  }

  function setAdjustmentValue(key: AdjustmentKey, value: number) {
    setAdjustments((prev) => ({ ...prev, [key]: value }))
  }

  async function saveFormula() {
    if (favorites.length === 0) {
      setSaveStatus('error')
      setSaveError('Ajoutez au moins une matière première avant d\'enregistrer.')
      return
    }

    setSaveStatus('saving')
    setSaveError(null)

    try {
      const shares = computeFormulaShares(favorites, facets, adjustments, catalog)
      await createFormula({
        name: formulaName,
        facets,
        adjustments,
        lines: shares.map((share) => ({
          materialId: share.material.id,
          quantity: share.percent,
        })),
      })
      setSaveStatus('success')
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const value = useMemo(
    () => ({
      catalog,
      catalogLoading,
      catalogError,
      favorites,
      addFavorite,
      removeFavorite,
      facets,
      setFacetValue,
      resetFacetsToFavorites,
      adjustments,
      setAdjustmentValue,
      formulaName,
      setFormulaName,
      saveStatus,
      saveError,
      saveFormula,
    }),
    [
      catalog,
      catalogLoading,
      catalogError,
      favorites,
      facets,
      adjustments,
      formulaName,
      saveStatus,
      saveError,
    ],
  )

  return (
    <FormulaContext.Provider value={value}>
      {children}
    </FormulaContext.Provider>
  )
}

export function useFormula() {
  const ctx = useContext(FormulaContext)
  if (!ctx) throw new Error('useFormula must be used within FormulaProvider')
  return ctx
}

export { FACETS, ADJUSTMENTS }
