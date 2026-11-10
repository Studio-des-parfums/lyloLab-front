import { API_URL, apiFetch, readErrorMessage } from './api'

/** in_force, upcoming (adopted, not applicable yet) or proposal. */
export type RegulationStatus = 'in_force' | 'upcoming' | 'proposal'

export interface RegulationSummary {
  id: string
  name: string
  description: string | null
  /** false for the regulations derived from the materials' regulatory data. */
  custom: boolean
  continent: string | null
  country: string | null
  /** ISO date from which the regulation applies, when not in force yet. */
  effectiveFrom: string | null
  status: RegulationStatus
  materialCount: number
}

export interface OfficialSource {
  ref: number
  jurisdiction: string
  organisation: string
  title: string
  date: string
  url: string
  usage: string | null
}

export interface RegulationInfoPayload {
  name: string
  description?: string
  continent?: string
  country?: string
}

export interface RegulationMaterial {
  materialId: string
  material: string
  status: string
  /** 0 when banned, null when the regulation sets no number. */
  maxPercent: number | null
  detail: string | null
  note: string | null
}

export interface RegulationDetail extends RegulationSummary {
  materials: RegulationMaterial[]
  /** Substances listed by the regulation (e.g. the 26 EU allergens). */
  substances: { name: string; casNumber: string | null }[]
  sources: OfficialSource[]
}

export interface CustomLimit {
  regulationId: string
  regulation: string
  materialId: string
  maxPercent: number
}

async function request<T>(path: string, init: RequestInit = {}, fallback: string): Promise<T> {
  const res = await apiFetch(`${API_URL}/api/regulations${path}`, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, fallback))
  return res.status === 204 ? (undefined as T) : res.json()
}

export const listRegulations = () =>
  request<RegulationSummary[]>('', {}, 'Impossible de charger les réglementations')

export const getRegulation = (id: string) =>
  request<RegulationDetail>(`/${id}`, {}, 'Impossible de charger la réglementation')

export const listCustomLimits = () =>
  request<CustomLimit[]>('/custom-limits', {}, 'Impossible de charger les limites personnalisées')

export const createRegulation = (payload: RegulationInfoPayload) =>
  request<RegulationDetail>(
    '',
    { method: 'POST', body: JSON.stringify(payload) },
    'Impossible de créer la réglementation',
  )

export const updateRegulation = (id: string, payload: Partial<RegulationInfoPayload>) =>
  request<RegulationDetail>(
    `/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    'Impossible de modifier la réglementation',
  )

export const deleteRegulation = (id: string) =>
  request<void>(`/${id}`, { method: 'DELETE' }, 'Impossible de supprimer la réglementation')

export const upsertRegulationMaterial = (
  id: string,
  payload: { materialId: string; maxPercent: number | null; note?: string },
) =>
  request<RegulationDetail>(
    `/${id}/materials`,
    { method: 'PUT', body: JSON.stringify(payload) },
    "Impossible d'enregistrer la matière",
  )

export const removeRegulationMaterial = (id: string, materialId: string) =>
  request<RegulationDetail>(
    `/${id}/materials/${materialId}`,
    { method: 'DELETE' },
    'Impossible de retirer la matière',
  )
