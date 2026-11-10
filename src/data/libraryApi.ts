import { API_URL, apiFetch, readErrorMessage } from './api'

export interface FacetDefinition {
  facet: string
  description: string | null
  examples: string | null
  customized: boolean
}

export interface Country {
  name: string
  isoNumeric: string | null
  continent: string
  kind: 'country' | 'region'
}

export interface OlfactiveFamily {
  code: string
  name: string
  parentCode: string | null
  description: string | null
  facets: string[]
  sourceUrl: string | null
  subfamilies: OlfactiveFamily[]
}

export interface ReferenceSource {
  title: string
  url: string
}

export interface ReferenceInterpretation {
  materialId: string
  material: string
  role: string
  evokes?: string
}

export interface ReferenceDraft {
  name: string
  brand: string | null
  year: number | null
  perfumer: string | null
  familyCode: string | null
  description: string | null
  topNotes: string[]
  heartNotes: string[]
  baseNotes: string[]
  sources: ReferenceSource[]
  interpretation: ReferenceInterpretation[]
  formulaIds?: string[]
}

export interface ReferencePerfume extends ReferenceDraft {
  id: string
  createdByName: string | null
  createdAt: string
  formulas: { id: string; name: string; status: string }[]
}

export interface MaterialNote {
  id: string
  text: string
  rating: number | null
  authorId: string | null
  authorName: string
  createdAt: string
  material?: { id: string; name: string }
}

export interface BlindTestItem {
  code: string
  guessMaterialId: string | null
  guessMaterial: string | null
  guessFacet: string | null
  materialId?: string
  material?: string
  facet?: string | null
  correct?: boolean | null
  facetCorrect?: boolean | null
}

export interface BlindTest {
  id: string
  userName: string
  items: BlindTestItem[]
  score: number | null
  facetScore: number | null
  createdAt: string
  completedAt: string | null
}

export interface BlindTestHistory {
  tests: {
    id: string
    userName: string
    count: number
    score: number | null
    facetScore: number | null
    createdAt: string
    completedAt: string | null
  }[]
  leaderboard: { userName: string; tests: number; score: number; facetScore: number }[]
}

async function request<T>(path: string, init: RequestInit = {}, fallback: string): Promise<T> {
  const res = await apiFetch(`${API_URL}/api/library${path}`, {
    ...init,
    headers: typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, fallback))
  return res.status === 204 ? (undefined as T) : res.json()
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const getFacetDefinitions = () =>
  request<FacetDefinition[]>('/facets', {}, 'Impossible de charger les facettes')

export const updateFacetDefinition = (facet: string, payload: { description: string; examples?: string }) =>
  request<FacetDefinition[]>(
    `/facets/${encodeURIComponent(facet)}`,
    json('PUT', payload),
    'Impossible de modifier la facette',
  )

export const resetFacetDefinition = (facet: string) =>
  request<FacetDefinition[]>(
    `/facets/${encodeURIComponent(facet)}`,
    { method: 'DELETE' },
    'Impossible de rétablir la facette',
  )

export const getCountries = () =>
  request<Country[]>('/countries', {}, 'Impossible de charger les pays')

export const getFamilies = () =>
  request<OlfactiveFamily[]>('/families', {}, 'Impossible de charger les familles olfactives')

export const listReferences = () =>
  request<ReferencePerfume[]>('/references', {}, 'Impossible de charger les références')

export const analyzeReference = (query: string) =>
  request<ReferenceDraft>(
    '/references/analyze',
    json('POST', { query }),
    "L'analyse de la référence a échoué",
  )

export const createReference = (draft: ReferenceDraft) =>
  request<ReferencePerfume>('/references', json('POST', draft), "Impossible d'enregistrer la référence")

export const updateReference = (id: string, draft: ReferenceDraft) =>
  request<ReferencePerfume>(`/references/${id}`, json('PATCH', draft), 'Impossible de modifier la référence')

export const deleteReference = (id: string) =>
  request<void>(`/references/${id}`, { method: 'DELETE' }, 'Impossible de supprimer la référence')

export const getRecentNotes = () =>
  request<MaterialNote[]>('/notes', {}, 'Impossible de charger les notes')

export const getMaterialNotes = (materialId: string) =>
  request<MaterialNote[]>(`/materials/${materialId}/notes`, {}, 'Impossible de charger les notes')

export const addMaterialNote = (materialId: string, payload: { text: string; rating?: number | null }) =>
  request<MaterialNote[]>(
    `/materials/${materialId}/notes`,
    json('POST', payload),
    "Impossible d'ajouter la note",
  )

export const deleteMaterialNote = (id: string) =>
  request<MaterialNote[]>(`/notes/${id}`, { method: 'DELETE' }, 'Impossible de supprimer la note')

export const getBlindTests = () =>
  request<BlindTestHistory>('/blind-tests', {}, "Impossible de charger l'historique")

export const createBlindTest = (payload: { count: number; onlyInStock?: boolean; facets?: string[] }) =>
  request<BlindTest>('/blind-tests', json('POST', payload), 'Impossible de préparer le test')

export const getBlindTest = (id: string, reveal = false) =>
  request<BlindTest>(`/blind-tests/${id}${reveal ? '?reveal=true' : ''}`, {}, 'Impossible de charger le test')

export const submitBlindTest = (
  id: string,
  answers: { code: string; guessMaterialId: string | null; guessFacet: string | null }[],
) => request<BlindTest>(`/blind-tests/${id}/submit`, json('POST', { answers }), 'Impossible de corriger le test')

export const deleteBlindTest = (id: string) =>
  request<void>(`/blind-tests/${id}`, { method: 'DELETE' }, 'Impossible de supprimer le test')
