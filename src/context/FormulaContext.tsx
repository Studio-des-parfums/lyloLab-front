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
import { parseIfraLimitPercent } from '../data/ifraLimit'
import type { FormulaChange } from '../data/aiApi'
import {
  adjustmentsFromFacets,
  catalogAverageFacets,
  facetsForAdjustment,
  facetsFromShares,
} from '../data/profileLinks'
import {
  convertFormulaToMaterial,
  createFormula,
  finalizeFormula,
  formulaAuthor,
  getFormula,
  updateFormula,
  type FormulaDetail,
} from '../data/formulasApi'
import {
  createClient as apiCreateClient,
  createProject as apiCreateProject,
  listClients,
  type Client,
  type CreateClientPayload,
  type CreateProjectPayload,
} from '../data/clientsApi'

const DEFAULT_FORMULA_NAME = 'Mon Accord sur Mesure'
const DEFAULT_TOTAL_VOLUME_ML = 50

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

  /** Read from the facets (see profileLinks); setting one rewrites the facets. */
  adjustments: Record<AdjustmentKey, number>
  setAdjustmentValue: (key: AdjustmentKey, value: number) => void

  manualMl: Record<string, number> | null
  setManualMl: (value: Record<string, number> | null) => void

  formulaName: string
  setFormulaName: (name: string) => void
  /** Résultat visé, commun à toutes les versions. */
  formulaDescription: string
  setFormulaDescription: (description: string) => void

  /** Applies a set of assistant-proposed changes in one go, once the user accepted them. */
  applyAiChanges: (changes: FormulaChange[]) => void

  totalVolumeMl: number
  setTotalVolumeMl: (ml: number) => void

  saveStatus: SaveStatus
  saveError: string | null
  /** Resolves to true when the formula was persisted. */
  saveFormula: () => Promise<boolean>
  /** True when leaving the builder now would lose work (unsaved new formula or edits since last save). */
  hasUnsavedChanges: boolean

  formulaId: string | null
  /** Author and creation date of the saved formula; null for a new, unsaved one. */
  formulaOrigin: { author: string | null; createdAt: string } | null
  formulaStatus: 'draft' | 'completed'
  /** Numéro de version : celui de la formule chargée, ou celui à venir pour une nouvelle version. */
  formulaVersion: number | null
  /** Identifiant XXX-XXX-n de la version ouverte (null tant qu'elle n'est pas enregistrée). */
  formulaCode: string | null
  /** Version finale de la formule (toutes versions confondues), s'il y en a une. */
  finalVersionId: string | null
  /** A finalized formula is read-only: it can only be duplicated into a new version. */
  isLocked: boolean
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

function originOf(formula: FormulaDetail) {
  return { author: formulaAuthor(formula), createdAt: formula.createdAt }
}

export function FormulaProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Material[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [favorites, setFavorites] = useState<Material[]>([])
  const [facets, setFacets] = useState<Record<Facet, number>>(() =>
    averageFacetsFromMaterials([]),
  )
  const [facetsTouched, setFacetsTouched] = useState(false)


  const [manualMl, setManualMl] = useState<Record<string, number> | null>(null)

  const [formulaName, setFormulaName] = useState(DEFAULT_FORMULA_NAME)
  const [formulaDescription, setFormulaDescription] = useState('')
  const [totalVolumeMl, setTotalVolumeMlState] = useState(DEFAULT_TOTAL_VOLUME_ML)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const [formulaId, setFormulaId] = useState<string | null>(null)
  const [formulaOrigin, setFormulaOrigin] =
    useState<FormulaContextValue['formulaOrigin']>(null)
  const [formulaStatus, setFormulaStatus] = useState<'draft' | 'completed'>('draft')
  const [formulaVersion, setFormulaVersion] = useState<number | null>(null)
  const [formulaCode, setFormulaCode] = useState<string | null>(null)
  const [finalVersionId, setFinalVersionId] = useState<string | null>(null)
  // Formule source quand on prépare une nouvelle version (envoyée à la première sauvegarde).
  const [versionOfId, setVersionOfId] = useState<string | null>(null)
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

  const isLocked = formulaStatus === 'completed'

  // Fingerprint of everything persistFormula sends; compared against the last
  // loaded/saved one to detect unsaved edits.
  const signature = useMemo(
    () =>
      JSON.stringify({
        formulaName,
        totalVolumeMl,
        projectId,
        favorites: favorites.map((m) => m.id),
        facets,
        manualMl,
      }),
    [formulaName, totalVolumeMl, projectId, favorites, facets, manualMl],
  )
  const [savedSignature, setSavedSignature] = useState<string | null>(null)
  // Set after a load/save: the next render's signature becomes the baseline,
  // once all the batched state updates have landed.
  const [captureBaseline, setCaptureBaseline] = useState(false)

  useEffect(() => {
    if (!captureBaseline) return
    setSavedSignature(signature)
    setCaptureBaseline(false)
  }, [captureBaseline, signature])

  const hasUnsavedChanges =
    !isLocked &&
    favorites.length > 0 &&
    (formulaId === null || (!captureBaseline && signature !== savedSignature))

  const baselineFacets = useMemo(() => catalogAverageFacets(catalog), [catalog])
  const adjustments = useMemo(
    () => adjustmentsFromFacets(facets, baselineFacets),
    [facets, baselineFacets],
  )

  async function refreshCatalog() {
    const materials = await fetchMaterials()
    setCatalog(materials)
  }

  function updateTotalVolumeMl(next: number) {
    if (isLocked) return
    if (manualMl && totalVolumeMl > 0 && next !== totalVolumeMl) {
      const factor = next / totalVolumeMl
      setManualMl(
        Object.fromEntries(
          Object.entries(manualMl).map(([id, ml]) => [id, ml * factor]),
        ),
      )
    }
    setTotalVolumeMlState(next)
  }

  function addFavorite(material: Material) {
    if (isLocked) return
    setManualMl(null)
    setFavorites((prev) => {
      const next = [...prev, material]
      if (!facetsTouched) setFacets(averageFacetsFromMaterials(next))
      return next
    })
  }

  function removeFavorite(id: string) {
    if (isLocked) return
    setManualMl(null)
    setFavorites((prev) => {
      const next = prev.filter((m) => m.id !== id)
      if (!facetsTouched) setFacets(averageFacetsFromMaterials(next))
      return next
    })
  }

  function setFacetValue(facet: Facet, value: number) {
    if (isLocked) return
    setManualMl(null)
    setFacetsTouched(true)
    setFacets((prev) => ({ ...prev, [facet]: value }))
  }

  function resetFacetsToFavorites() {
    if (isLocked) return
    setManualMl(null)
    setFacetsTouched(false)
    setFacets(averageFacetsFromMaterials(favorites))
  }

  function setAdjustmentValue(key: AdjustmentKey, value: number) {
    if (isLocked) return
    setManualMl(null)
    setFacetsTouched(true)
    setFacets((prev) => facetsForAdjustment(prev, key, value, baselineFacets))
  }

  /** Facets of the blend described by a manual ml distribution. */
  function facetsOfManualMl(
    materials: Material[],
    ml: Record<string, number>,
  ): Record<Facet, number> | null {
    return facetsFromShares(
      materials.map((material) => ({ material, percent: ml[material.id] ?? 0 })),
    )
  }

  function updateManualMl(value: Record<string, number> | null) {
    if (isLocked) return
    setManualMl(value)
    if (!value) return
    // A hand-edited formula drives the radar (and so the adjustments).
    const blendFacets = facetsOfManualMl(favorites, value)
    if (blendFacets) {
      setFacetsTouched(true)
      setFacets(blendFacets)
    }
  }

  function updateFormulaName(name: string) {
    if (!isLocked) setFormulaName(name)
  }


  function applyAiChanges(changes: FormulaChange[]) {
    if (isLocked) return
    let nextFavorites = favorites
    let nextFacets = facets
    let nextName = formulaName
    let nextVolume = totalVolumeMl
    let facetsEdited = false
    let compositionChanged = false
    let percentages: Record<string, number> | null = null
    let resetDistribution = false

    for (const change of changes) {
      switch (change.type) {
        case 'set_facet':
          nextFacets = { ...nextFacets, [change.facet]: change.value }
          facetsEdited = true
          compositionChanged = true
          break
        case 'set_adjustment':
          nextFacets = facetsForAdjustment(
            nextFacets,
            change.adjustment as AdjustmentKey,
            change.value,
            baselineFacets,
          )
          facetsEdited = true
          compositionChanged = true
          break
        case 'add_material': {
          const material = catalog.find((m) => m.id === change.materialId)
          if (material && !nextFavorites.some((m) => m.id === material.id)) {
            nextFavorites = [...nextFavorites, material]
            compositionChanged = true
          }
          break
        }
        case 'remove_material':
          nextFavorites = nextFavorites.filter((m) => m.id !== change.materialId)
          compositionChanged = true
          break
        case 'set_percentages':
          for (const item of change.items) {
            const material = catalog.find((m) => m.id === item.materialId)
            if (material && !nextFavorites.some((m) => m.id === material.id)) {
              nextFavorites = [...nextFavorites, material]
            }
          }
          percentages = Object.fromEntries(
            change.items.map((item) => [item.materialId, item.percent]),
          )
          break
        case 'reset_auto_distribution':
          resetDistribution = true
          break
        case 'rename_formula':
          nextName = change.name
          break
        case 'set_total_volume':
          nextVolume = change.ml
          break
      }
    }

    if (facetsEdited) {
      setFacetsTouched(true)
    } else if (!facetsTouched && nextFavorites !== favorites) {
      nextFacets = averageFacetsFromMaterials(nextFavorites)
    }

    let nextManualMl: Record<string, number> | null = manualMl
    if (percentages) {
      // Same IFRA ceiling the table enforces on manual edits.
      const byId = percentages
      nextManualMl = Object.fromEntries(
        nextFavorites.map((material) => {
          const limit = parseIfraLimitPercent(material.regulatory?.ifraLimit)
          const percent = Math.min(byId[material.id] ?? 0, limit ?? 100)
          return [material.id, (percent / 100) * nextVolume]
        }),
      )
      const blendFacets = facetsOfManualMl(nextFavorites, nextManualMl)
      if (blendFacets) {
        nextFacets = blendFacets
        setFacetsTouched(true)
      }
    } else if (resetDistribution || compositionChanged) {
      nextManualMl = null
    } else if (manualMl && totalVolumeMl > 0 && nextVolume !== totalVolumeMl) {
      const factor = nextVolume / totalVolumeMl
      nextManualMl = Object.fromEntries(
        Object.entries(manualMl).map(([id, ml]) => [id, ml * factor]),
      )
    }

    setFavorites(nextFavorites)
    setFacets(nextFacets)
    setFormulaName(nextName)
    setTotalVolumeMlState(nextVolume)
    setManualMl(nextManualMl)
  }

  async function persistFormula() {
    if (favorites.length === 0) {
      throw new Error('Ajoutez au moins une matière première avant d\'enregistrer.')
    }

    const computedShares = computeFormulaShares(favorites, facets, adjustments, catalog)
    const lines = manualMl
      ? favorites.map((material) => ({
          materialId: material.id,
          quantity:
            totalVolumeMl > 0
              ? ((manualMl[material.id] ?? 0) / totalVolumeMl) * 100
              : 0,
        }))
      : computedShares.map((share) => ({
          materialId: share.material.id,
          quantity: share.percent,
        }))

    const payload = {
      name: formulaName,
      // Envoyée seulement à la création : ensuite elle a son propre enregistrement immédiat.
      ...(formulaId ? {} : { description: formulaDescription.trim() || null }),
      facets,
      adjustments,
      totalVolumeMl,
      projectId,
      lines,
    }

    const saved = formulaId
      ? await updateFormula(formulaId, payload)
      : await createFormula({
          ...payload,
          status: 'draft' as const,
          ...(versionOfId ? { versionOfId } : {}),
        })

    setFormulaId(saved.id)
    setFormulaVersion(saved.version)
    setFormulaCode(saved.code)
    setVersionOfId(null)
    setFormulaOrigin(originOf(saved))
    setFormulaStatus(saved.status ?? 'draft')
    return saved
  }

  async function saveFormula() {
    setSaveStatus('saving')
    setSaveError(null)

    try {
      await persistFormula()
      setSavedSignature(signature)
      setSaveStatus('success')
      return true
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Erreur inconnue')
      return false
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

  function manualMlFromSaved(
    lines: { material: { id: string }; quantity: number }[],
    savedFacets: Record<Facet, number>,
    savedAdjustments: Record<AdjustmentKey, number>,
    volume: number,
  ): Record<string, number> | null {
    const savedFavorites = lines.map((line) => line.material as unknown as Material)
    const computed = computeFormulaShares(
      savedFavorites,
      savedFacets,
      savedAdjustments,
      catalog,
    )
    const computedById = new Map(
      computed.map((share) => [share.material.id, share.percent]),
    )
    const isManual = lines.some(
      (line) =>
        Math.abs(line.quantity - (computedById.get(line.material.id) ?? 0)) > 0.01,
    )
    if (!isManual) return null
    return Object.fromEntries(
      lines.map((line) => [
        line.material.id,
        (line.quantity / 100) * volume,
      ]),
    )
  }

  async function loadFormula(id: string) {
    setLoadStatus('saving')
    setLoadError(null)

    try {
      const detail = await getFormula(id)
      const volume = detail.totalVolumeMl ?? DEFAULT_TOTAL_VOLUME_ML
      const loadedFacets = detail.facets as Record<Facet, number>
      // Adjustments are read from the facets; the stored ones are ignored, and
      // comparing against them below keeps the saved quantities exact.
      const loadedAdjustments = adjustmentsFromFacets(loadedFacets, baselineFacets)
      setFormulaId(detail.id)
      setFormulaVersion(detail.version)
      setFormulaCode(detail.code)
      setFinalVersionId(detail.finalVersionId)
      setVersionOfId(null)
      setCaptureBaseline(true)
      setFormulaOrigin(originOf(detail))
      setFormulaStatus(detail.status)
      setFormulaName(detail.name)
      setFormulaDescription(detail.description ?? '')
      setTotalVolumeMlState(volume)
      setFacets(loadedFacets)
      setFacetsTouched(true)
      setFavorites(detail.lines.map((line) => line.material as unknown as Material))
      setManualMl(
        manualMlFromSaved(detail.lines, loadedFacets, loadedAdjustments, volume),
      )
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
      const volume = detail.totalVolumeMl ?? DEFAULT_TOTAL_VOLUME_ML
      const loadedFacets = detail.facets as Record<Facet, number>
      // Adjustments are read from the facets; the stored ones are ignored, and
      // comparing against them below keeps the saved quantities exact.
      const loadedAdjustments = adjustmentsFromFacets(loadedFacets, baselineFacets)
      setFormulaId(null)
      setFormulaOrigin(null)
      setFormulaStatus('draft')
      // Le numéro de version est géré par le serveur : on garde le nom de la formule.
      setFormulaName(detail.name)
      setFormulaDescription(detail.description ?? '')
      setVersionOfId(detail.id)
      setFinalVersionId(detail.finalVersionId)
      setFormulaVersion(null)
    setFormulaCode(null)
      setFormulaCode(null)
      setTotalVolumeMlState(volume)
      setFacets(loadedFacets)
      setFacetsTouched(true)
      setFavorites(detail.lines.map((line) => line.material as unknown as Material))
      setManualMl(
        manualMlFromSaved(detail.lines, loadedFacets, loadedAdjustments, volume),
      )
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
    setFormulaVersion(null)
    setFormulaCode(null)
    setVersionOfId(null)
    setFinalVersionId(null)
    setFormulaOrigin(null)
    setFormulaStatus('draft')
    setSaveStatus('idle')
    setSaveError(null)
    setFinalizeStatus('idle')
    setFinalizeError(null)
    setConvertStatus('idle')
    setConvertError(null)
    setFormulaName(DEFAULT_FORMULA_NAME)
    setFormulaDescription('')
    setTotalVolumeMlState(DEFAULT_TOTAL_VOLUME_ML)
    setManualMl(null)
    setFavorites([])
    setFacetsTouched(false)
    setFacets(averageFacetsFromMaterials([]))
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
      manualMl,
      setManualMl: updateManualMl,
      formulaName,
      setFormulaName: updateFormulaName,
      formulaDescription,
      setFormulaDescription,
      applyAiChanges,
      totalVolumeMl,
      setTotalVolumeMl: updateTotalVolumeMl,
      saveStatus,
      saveError,
      saveFormula,
      hasUnsavedChanges,
      formulaId,
      formulaOrigin,
      formulaStatus,
      formulaVersion,
      formulaCode,
      finalVersionId,
      isLocked,
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
      facetsTouched,
      facets,
      adjustments,
      manualMl,
      formulaName,
      formulaDescription,
      totalVolumeMl,
      saveStatus,
      saveError,
      hasUnsavedChanges,
      formulaId,
      formulaOrigin,
      formulaStatus,
      formulaVersion,
      formulaCode,
      finalVersionId,
      isLocked,
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
