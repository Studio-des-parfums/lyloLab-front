import { API_URL, apiFetch, readErrorMessage } from './api'

export type Grade = 'conform' | 'slight' | 'altered'
export type Appearance = 'clear' | 'hazy' | 'deposit' | 'separation'
export type TestStatus = 'in_progress' | 'completed' | 'cancelled'
export type Conclusion = 'conform' | 'minor' | 'non_conform'
export type RiskType = 'oxidation' | 'light' | 'heat' | 'ph' | 'hydrolysis' | 'discoloration'

export interface ConditionInfo {
  code: string
  label: string
  description: string
  checkpoints: number[]
}

export interface StabilityCatalog {
  conditions: ConditionInfo[]
  bases: { code: string; label: string }[]
  risks: Record<RiskType, string>
}

export interface Checkpoint {
  day: number
  dueDate: string
  done: boolean
}

export interface Observation {
  id: string
  day: number | null
  observedAt: string
  odor: Grade
  color: Grade
  appearance: Appearance
  ph: number | null
  viscosity: number | null
  peroxideValue: number | null
  comment: string | null
  observerName: string | null
  grade: Grade
  photos: { id: string; mimeType: string; fileName: string | null }[]
}

export interface StabilityTest {
  id: string
  campaignId: string
  condition: string
  conditionLabel: string | null
  base: string
  container: string | null
  startDate: string
  checkpoints: number[]
  status: TestStatus
  conclusion: Conclusion | null
  notes: string | null
  createdByName: string | null
  createdAt: string
  formula: { id: string; name: string; status: string }
  observations: Observation[]
  checkpointList: Checkpoint[]
  nextCheckpoint: Checkpoint | null
  overdueCount: number
  dueTodayCount: number
  progress: number
  worstGrade: Grade | null
}

export interface StabilityTestDetail extends StabilityTest {
  campaign: { id: string; condition: string; conditionLabel: string | null; status: TestStatus }[]
}

export interface DueCheckpoint {
  testId: string
  formula: { id: string; name: string }
  condition: string
  conditionLabel: string | null
  base: string
  day: number
  dueDate: string
  state: 'overdue' | 'today' | 'upcoming'
}

export interface StabilityOverview {
  due: DueCheckpoint[]
  counts: Partial<Record<TestStatus, number>>
  nonConform: number
}

export interface StabilitySpec {
  substance: string
  casNumber: string | null
  parameter: string
  maxValue: number
  unit: string
  note: string | null
  sourceRef: number | null
}

export type TriggerKind =
  | 'oxygen'
  | 'light'
  | 'heat'
  | 'cold'
  | 'ph'
  | 'moisture'
  | 'solvent'
  | 'duration'

export interface TriggerFactor {
  kind: TriggerKind
  label: string
}

export interface MaterialStability {
  materialId: string
  material: string
  stable: boolean
  risks: RiskType[]
  issue: string | null
  triggers: string | null
  triggerFactors: TriggerFactor[]
  impact: string | null
  compatibility: string | null
  specs: StabilitySpec[]
}

export interface FormulaRiskReport {
  materials: (MaterialStability & { percent: number | null })[]
  riskCounts: Partial<Record<RiskType, number>>
  recommended: { condition: string; reasons: string[] }[]
  unknownCount: number
}

export interface MaterialStabilityDetail {
  known: MaterialStability
  history: {
    testId: string
    formula: { id: string; name: string }
    condition: string
    conditionLabel: string | null
    status: TestStatus
    conclusion: Conclusion | null
    startDate: string
    worstGrade: Grade | null
  }[]
  trends: { condition: string; tests: number; degraded: number }[]
}

export interface CampaignPayload {
  formulaId: string
  base: string
  container?: string
  startDate: string
  notes?: string
  conditions: { condition: string; conditionLabel?: string; checkpoints: number[] }[]
}

export interface ObservationPayload {
  day: number | null
  observedAt: string
  odor: Grade
  color: Grade
  appearance: Appearance
  ph?: number | null
  viscosity?: number | null
  peroxideValue?: number | null
  comment?: string
}

async function request<T>(path: string, init: RequestInit = {}, fallback: string): Promise<T> {
  const isJson = typeof init.body === 'string'
  const res = await apiFetch(`${API_URL}/api/stability${path}`, {
    ...init,
    headers: isJson ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, fallback))
  return res.status === 204 ? (undefined as T) : res.json()
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const getStabilityCatalog = () =>
  request<StabilityCatalog>('/catalog', {}, 'Impossible de charger les conditions de test')

export const getStabilityOverview = () =>
  request<StabilityOverview>('/overview', {}, 'Impossible de charger les contrôles à faire')

export const listStabilityTests = (filters: { formulaId?: string; status?: TestStatus } = {}) => {
  const query = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()
  return request<StabilityTest[]>(`/tests${query ? `?${query}` : ''}`, {}, 'Impossible de charger les tests')
}

export const getStabilityTest = (id: string) =>
  request<StabilityTestDetail>(`/tests/${id}`, {}, 'Impossible de charger le test')

export const createStabilityCampaign = (payload: CampaignPayload) =>
  request<StabilityTest[]>('/tests', json('POST', payload), 'Impossible de lancer les tests')

export const updateStabilityTest = (
  id: string,
  payload: {
    status?: TestStatus
    conclusion?: Conclusion | null
    notes?: string
    container?: string
    checkpoints?: number[]
  },
) => request<StabilityTestDetail>(`/tests/${id}`, json('PATCH', payload), 'Impossible de modifier le test')

export const deleteStabilityTest = (id: string) =>
  request<void>(`/tests/${id}`, { method: 'DELETE' }, 'Impossible de supprimer le test')

export const addObservation = (testId: string, payload: ObservationPayload) =>
  request<{ observationId: string; test: StabilityTestDetail }>(
    `/tests/${testId}/observations`,
    json('POST', payload),
    "Impossible d'enregistrer l'observation",
  )

export const updateObservation = (id: string, payload: ObservationPayload) =>
  request<StabilityTestDetail>(`/observations/${id}`, json('PATCH', payload), "Impossible de modifier l'observation")

export const deleteObservation = (id: string) =>
  request<StabilityTestDetail>(`/observations/${id}`, { method: 'DELETE' }, "Impossible de supprimer l'observation")

export function uploadPhoto(observationId: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  return request<StabilityTestDetail>(
    `/observations/${observationId}/photos`,
    { method: 'POST', body },
    "Impossible d'envoyer la photo",
  )
}

export const deletePhoto = (id: string) =>
  request<StabilityTestDetail>(`/photos/${id}`, { method: 'DELETE' }, 'Impossible de supprimer la photo')

/** Photos need the session header: fetched as a blob and shown through an object URL. */
export async function fetchPhotoUrl(id: string): Promise<string> {
  const res = await apiFetch(`${API_URL}/api/stability/photos/${id}`)
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Photo indisponible'))
  return URL.createObjectURL(await res.blob())
}

export const getRisksForLines = (lines: { materialId: string; percent: number | null }[]) =>
  request<FormulaRiskReport>('/risks', json('POST', { lines }), "Impossible d'analyser la stabilité")

export const getFormulaRisks = (formulaId: string) =>
  request<FormulaRiskReport>(`/formulas/${formulaId}/risks`, {}, "Impossible d'analyser la stabilité")

export const getMaterialsStability = () =>
  request<MaterialStability[]>('/materials', {}, 'Impossible de charger les données de stabilité')

export const getMaterialStability = (materialId: string) =>
  request<MaterialStabilityDetail>(`/materials/${materialId}`, {}, 'Impossible de charger la stabilité')

// ── Labels ──────────────────────────────────────────────────────────────

export const GRADE_LABEL: Record<Grade, string> = {
  conform: 'Conforme',
  slight: 'Légère évolution',
  altered: 'Altéré',
}

export const APPEARANCE_LABEL: Record<Appearance, string> = {
  clear: 'Limpide',
  hazy: 'Trouble',
  deposit: 'Dépôt',
  separation: 'Déphasage',
}

export const STATUS_LABEL: Record<TestStatus, string> = {
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

export const CONCLUSION_LABEL: Record<Conclusion, string> = {
  conform: 'Conforme',
  minor: 'Écarts mineurs',
  non_conform: 'Non conforme',
}

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')
