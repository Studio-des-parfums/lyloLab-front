import { API_URL, apiFetch, readErrorMessage } from './api'

interface Author {
  id: string
  name: string
}

export interface FormulaNote {
  id: string
  body: string
  authorName: string
  author: Author | null
  createdAt: string
}

export interface FormulaMessage {
  id: string
  body: string
  mentions: string[]
  authorName: string
  author: Author | null
  createdAt: string
}

export interface AppNotification {
  id: string
  type: 'mention'
  actorName: string
  excerpt: string
  readAt: string | null
  createdAt: string
  formula: { id: string; name: string; version: number; code: string | null; projectId: string | null } | null
}

async function send<T>(url: string, init: RequestInit = {}, fallback = 'Erreur'): Promise<T> {
  const res = await apiFetch(url, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, fallback))
  return res.status === 204 ? (undefined as T) : res.json()
}

const formulaUrl = (id: string) => `${API_URL}/api/formulas/${id}`

export const updateFormulaDescription = (id: string, description: string | null) =>
  send<{ description: string | null }>(`${formulaUrl(id)}/description`, {
    method: 'PATCH',
    body: JSON.stringify({ description }),
  }, 'Description non enregistrée')

export const updateFormulaSchedule = (id: string, dates: { startDate?: string | null; endDate?: string | null }) =>
  send<{ startDate: string | null; endDate: string | null }>(`${formulaUrl(id)}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify(dates),
  }, 'Dates non enregistrées')

export const listNotes = (id: string) => send<FormulaNote[]>(`${formulaUrl(id)}/notes`)
export const addNote = (id: string, body: string) =>
  send<FormulaNote>(`${formulaUrl(id)}/notes`, { method: 'POST', body: JSON.stringify({ body }) }, 'Note non enregistrée')
export const deleteNote = (id: string, noteId: string) =>
  send<void>(`${formulaUrl(id)}/notes/${noteId}`, { method: 'DELETE' }, 'Suppression impossible')

export const listMessages = (id: string) => send<FormulaMessage[]>(`${formulaUrl(id)}/messages`)
export const postMessage = (id: string, body: string, mentionUserIds: string[]) =>
  send<FormulaMessage>(`${formulaUrl(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, mentionUserIds }),
  }, 'Message non envoyé')

export const listNotifications = () => send<AppNotification[]>(`${API_URL}/api/notifications`)
export const markNotificationRead = (id: string) =>
  send<void>(`${API_URL}/api/notifications/${id}/read`, { method: 'POST' })
export const markAllNotificationsRead = () =>
  send<void>(`${API_URL}/api/notifications/read-all`, { method: 'POST' })

export const markFinalVersion = (id: string) =>
  send<{ finalVersionId: string }>(`${formulaUrl(id)}/final`, { method: 'POST' }, 'Impossible de définir la version finale')
export const unmarkFinalVersion = (id: string) =>
  send<{ finalVersionId: null }>(`${formulaUrl(id)}/final`, { method: 'DELETE' }, 'Impossible de retirer la version finale')
