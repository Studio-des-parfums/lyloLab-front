import { API_URL, apiFetch, readErrorMessage } from './api'

export interface ApiKey {
  id: string
  name: string
  prefix: string
  webhookUrl: string | null
  webhookSecret: string
  createdAt: string
  revokedAt: string | null
}

/** Seule la réponse de création contient la clé en clair. */
export interface CreatedApiKey extends ApiKey {
  key: string
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await apiFetch(`${API_URL}/api/api-keys${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Erreur clés API'))
  return res.json()
}

export const fetchApiKeys = () => send<ApiKey[]>('', 'GET')
export const createApiKey = (name: string, webhookUrl?: string) =>
  send<CreatedApiKey>('', 'POST', { name, webhookUrl: webhookUrl || undefined })
export const updateApiKey = (id: string, data: { name?: string; webhookUrl?: string | null }) =>
  send<ApiKey>(`/${id}`, 'PATCH', data)
export const revokeApiKey = (id: string) => send<ApiKey>(`/${id}`, 'DELETE')
