import { API_URL, apiFetch, readErrorMessage } from './api'

export type TeamRole = 'admin' | 'member'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: TeamRole
  team: { id: string; name: string }
}

interface SessionResponse {
  token: string
  user: SessionUser
}

/** Sign up by creating a team (teamName) or by joining one (inviteCode). */
export interface RegisterPayload {
  email: string
  password: string
  name: string
  teamName?: string
  inviteCode?: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  createdAt: string
}

export interface TeamDetail {
  id: string
  name: string
  /** Only sent to admins. */
  inviteCode: string | null
  members: TeamMember[]
}

async function post<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const res = await apiFetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, fallback))
  return res.json()
}

export function login(email: string, password: string): Promise<SessionResponse> {
  return post('/auth/login', { email, password }, 'Connexion impossible')
}

export function register(payload: RegisterPayload): Promise<SessionResponse> {
  return post('/auth/register', payload, 'Inscription impossible')
}

export async function fetchMe(): Promise<SessionUser> {
  const res = await apiFetch(`${API_URL}/api/auth/me`)
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Session invalide'))
  return res.json()
}

export async function fetchInviteInfo(code: string): Promise<{ teamName: string }> {
  const res = await apiFetch(`${API_URL}/api/auth/invite/${encodeURIComponent(code)}`)
  if (!res.ok) throw new Error(await readErrorMessage(res, "Code d'invitation inconnu"))
  return res.json()
}

export async function fetchTeam(): Promise<TeamDetail> {
  const res = await apiFetch(`${API_URL}/api/teams/current`)
  if (!res.ok) throw new Error(await readErrorMessage(res, "Impossible de charger l'équipe"))
  return res.json()
}

async function sendTeam(path: string, method: string, body?: unknown): Promise<TeamDetail> {
  const res = await apiFetch(`${API_URL}/api/teams/current${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, "Action impossible sur l'équipe"))
  return res.json()
}

export const renameTeam = (name: string) => sendTeam('', 'PATCH', { name })
export const regenerateInviteCode = () => sendTeam('/invite-code', 'POST')
export const updateMemberRole = (memberId: string, role: TeamRole) =>
  sendTeam(`/members/${memberId}`, 'PATCH', { role })
export const removeMember = (memberId: string) => sendTeam(`/members/${memberId}`, 'DELETE')

/** Link that opens the sign-up form with the code already filled in. */
export function inviteLink(code: string): string {
  return `${window.location.origin}/?invite=${code}`
}
