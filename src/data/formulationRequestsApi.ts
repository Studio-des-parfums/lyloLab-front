import { API_URL, apiFetch, readErrorMessage } from './api'

export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

interface Person {
  id: string
  name: string
  email: string
}

export interface FormulationRequest {
  id: string
  externalRef: string | null
  requesterName: string
  requesterEmail: string
  perfumeName: string | null
  description: string
  forClient: boolean
  clientCompany: string | null
  clientFirstName: string | null
  clientLastName: string | null
  clientEmail: string | null
  clientPhone: string | null
  projectName: string | null
  status: RequestStatus
  assignedTo: Person | null
  assignedAt: string | null
  startedAt: string | null
  completedBy: Person | null
  completedAt: string | null
  clientId: string | null
  projectId: string | null
  formulaId: string | null
  apiKey: { id: string; name: string } | null
  createdAt: string
}

const BASE = `${API_URL}/api/formulation-requests`

async function json<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw new Error(await readErrorMessage(res, fallback))
  return res.json()
}

export async function listFormulationRequests(): Promise<FormulationRequest[]> {
  return json(await apiFetch(BASE), 'Impossible de charger les demandes')
}

export async function countPendingRequests(): Promise<number> {
  const { pending } = await json<{ pending: number }>(await apiFetch(`${BASE}/count`), 'Erreur')
  return pending
}

export async function takeFormulationRequest(id: string): Promise<FormulationRequest> {
  return json(await apiFetch(`${BASE}/${id}/take`, { method: 'POST' }), 'Prise en charge impossible')
}

export async function startFormulationRequest(id: string): Promise<FormulationRequest> {
  return json(await apiFetch(`${BASE}/${id}/start`, { method: 'POST' }), 'Impossible de commencer')
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
}
