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
import {
  convertFormulaToMaterial,
  createFormula,
  finalizeFormula,
  getFormula,
  updateFormula,
} from '../data/formulasApi'
import {
  createClient as apiCreateClient,
  createProject as apiCreateProject,
  listClients,
  type Client,
  type CreateClientPayload,
  type CreateProjectPayload,
} from '../data/clientsApi'

const DEFAULT_ADJUSTMENTS: Record<AdjustmentKey, number> = {
  'Diffusion / Sillage': 70,
  Tenue: 80,
  Puissance: 60,
  Douceur: 50,
  Originalité: 65,
}

const DEFAULT_FORMULA_NAME = 'Mon Accord sur Mesure'
const DEFAULT_TOTAL_VOLUME_ML = 50

const VERSION_SUFFIX_PATTERN = /^(.*)\s+v(\d+)$/i

function nextVersionedName(name: string): string {
  const match = name.match(VERSION_SUFFIX_PATTERN)
  if (match) {
    const [, base, version] = match
    return `${base} v${parseInt(version, 10) + 1}`
  }
  return `${name} v2`
}

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

interface FormulaContextValue {
  catalog: Material[]
  catalogLoading: boolean
  catalogError: string | null
  refreshCatalog: () => Promise<void>

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

  totalVolumeMl: number
  setTotalVolumeMl: (ml: number) => void

  saveStatus: SaveStatus
  saveError: string | null
  saveFormula: () => Promise<void>

  formulaId: string | null
  formulaStatus: 'draft' | 'completed'
  finalizeStatus: SaveStatus
  finalizeError: string | null
  finalizeCurrentFormula: () => Promise<void>
  startNewFormula: () => void

  loadStatus: SaveStatus
  loadError: string | null
  loadFormula: (id: string) => Promise<void>
  duplicateFormula: (id: string) => Promise<void>

  convertStatus: SaveStatus
  convertError: string | null
  convertCurrentFormulaToMaterial: () => Promise<void>

  clients: Client[]
  clientsLoading: boolean
  projectId: string | null
  setProjectId: (id: string | null) => void
  createClientAndSelect: (payload: CreateClientPayload) => Promise<Client>
  createProjectAndSelect: (payload: Omit<CreateProjectPayload, 'clientId'>, clientId: string) => Promise<void>
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
  const [totalVolumeMl, setTotalVolumeMl] = useState(DEFAULT_TOTAL_VOLUME_ML)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const [formulaId, setFormulaId] = useState<string | null>(null)
  const [formulaStatus, setFormulaStatus] = useState<'draft' | 'completed'>('draft')
  const [finalizeStatus, setFinalizeStatus] = useState<SaveStatus>('idle')
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [loadStatus, setLoadStatus] = useState<SaveStatus>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [convertStatus, setConvertStatus] = useState<SaveStatus>('idle')
  const [convertError, setConvertError] = useState<string | null>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [projectId, setProjectId] = useState<string | null>(null)

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

  useEffect(() => {
    let cancelled = false

    listClients()
      .then((result) => {
        if (!cancelled) setClients(result)
      })
      .catch(() => {
        /* client/project picker is optional; silently ignore load failure */
      })
      .finally(() => {
        if (!cancelled) setClientsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshCatalog() {
    const materials = await fetchMaterials()
    setCatalog(materials)
  }

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

  async function persistFormula() {
    if (favorites.length === 0) {
      throw new Error('Ajoutez au moins une matière première avant d\'enregistrer.')
    }

    const shares = computeFormulaShares(favorites, facets, adjustments, catalog)
    const payload = {
      name: formulaName,
      facets,
      adjustments,
      totalVolumeMl,
      projectId,
      lines: shares.map((share) => ({
        materialId: share.material.id,
        quantity: share.percent,
      })),
    }

    const saved = formulaId
      ? await updateFormula(formulaId, payload)
      : await createFormula({ ...payload, status: 'draft' as const })

    setFormulaId(saved.id)
    setFormulaStatus(saved.status ?? 'draft')
    return saved
  }

  async function saveFormula() {
    setSaveStatus('saving')
    setSaveError(null)

    try {
      await persistFormula()
      setSaveStatus('success')
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function finalizeCurrentFormula() {
    setFinalizeStatus('saving')
    setFinalizeError(null)

    try {
      const saved = await persistFormula()
      const updated = await finalizeFormula(saved.id)
      setFormulaStatus(updated.status)
      setFinalizeStatus('success')
    } catch (err) {
      setFinalizeStatus('error')
      setFinalizeError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function loadFormula(id: string) {
    setLoadStatus('saving')
    setLoadError(null)

    try {
      const detail = await getFormula(id)
      setFormulaId(detail.id)
      setFormulaStatus(detail.status)
      setFormulaName(detail.name)
      setTotalVolumeMl(detail.totalVolumeMl ?? DEFAULT_TOTAL_VOLUME_ML)
      setFacets(detail.facets as Record<Facet, number>)
      setFacetsTouched(true)
      setAdjustments(detail.adjustments as Record<AdjustmentKey, number>)
      setFavorites(detail.lines.map((line) => line.material as unknown as Material))
      setProjectId(detail.project?.id ?? null)
      setSaveStatus('idle')
      setSaveError(null)
      setFinalizeStatus('idle')
      setFinalizeError(null)
      setConvertStatus('idle')
      setConvertError(null)
      setLoadStatus('success')
    } catch (err) {
      setLoadStatus('error')
      setLoadError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function duplicateFormula(id: string) {
    setLoadStatus('saving')
    setLoadError(null)

    try {
      const detail = await getFormula(id)
      setFormulaId(null)
      setFormulaStatus('draft')
      setFormulaName(nextVersionedName(detail.name))
      setTotalVolumeMl(detail.totalVolumeMl ?? DEFAULT_TOTAL_VOLUME_ML)
      setFacets(detail.facets as Record<Facet, number>)
      setFacetsTouched(true)
      setAdjustments(detail.adjustments as Record<AdjustmentKey, number>)
      setFavorites(detail.lines.map((line) => line.material as unknown as Material))
      setProjectId(detail.project?.id ?? null)
      setSaveStatus('idle')
      setSaveError(null)
      setFinalizeStatus('idle')
      setFinalizeError(null)
      setConvertStatus('idle')
      setConvertError(null)
      setLoadStatus('success')
    } catch (err) {
      setLoadStatus('error')
      setLoadError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function convertCurrentFormulaToMaterial() {
    if (!formulaId) {
      setConvertStatus('error')
      setConvertError('Enregistrez la formule avant de la transformer en matière première.')
      return
    }

    setConvertStatus('saving')
    setConvertError(null)

    try {
      await convertFormulaToMaterial(formulaId)
      const materials = await fetchMaterials()
      setCatalog(materials)
      setConvertStatus('success')
    } catch (err) {
      setConvertStatus('error')
      setConvertError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  function startNewFormula() {
    setFormulaId(null)
    setFormulaStatus('draft')
    setSaveStatus('idle')
    setSaveError(null)
    setFinalizeStatus('idle')
    setFinalizeError(null)
    setConvertStatus('idle')
    setConvertError(null)
    setFormulaName(DEFAULT_FORMULA_NAME)
    setTotalVolumeMl(DEFAULT_TOTAL_VOLUME_ML)
    setFavorites([])
    setFacetsTouched(false)
    setFacets(averageFacetsFromMaterials([]))
    setAdjustments(DEFAULT_ADJUSTMENTS)
    setProjectId(null)
  }

  async function createClientAndSelect(payload: CreateClientPayload) {
    const client = await apiCreateClient(payload)
    setClients((prev) => [...prev, { ...client, projects: [] }])
    return client
  }

  async function createProjectAndSelect(
    payload: Omit<CreateProjectPayload, 'clientId'>,
    clientId: string,
  ) {
    const project = await apiCreateProject({ ...payload, clientId })
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, projects: [...c.projects, project] } : c)),
    )
    setProjectId(project.id)
  }

  const value = useMemo(
    () => ({
      catalog,
      catalogLoading,
      catalogError,
      refreshCatalog,
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
      totalVolumeMl,
      setTotalVolumeMl,
      saveStatus,
      saveError,
      saveFormula,
      formulaId,
      formulaStatus,
      finalizeStatus,
      finalizeError,
      finalizeCurrentFormula,
      startNewFormula,
      loadStatus,
      loadError,
      loadFormula,
      duplicateFormula,
      convertStatus,
      convertError,
      convertCurrentFormulaToMaterial,
      clients,
      clientsLoading,
      projectId,
      setProjectId,
      createClientAndSelect,
      createProjectAndSelect,
    }),
    [
      catalog,
      catalogLoading,
      catalogError,
      favorites,
      facets,
      adjustments,
      formulaName,
      totalVolumeMl,
      saveStatus,
      saveError,
      formulaId,
      formulaStatus,
      finalizeStatus,
      finalizeError,
      loadStatus,
      loadError,
      convertStatus,
      convertError,
      clients,
      clientsLoading,
      projectId,
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
