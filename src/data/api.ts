/**
 * Backend origin, as set in VITE_API_URL at build time. Tolerates the usual
 * slips: without a protocol the browser would treat it as a path of the
 * frontend's own site, and a trailing "/api" would double every route.
 */
function normalizeApiUrl(raw: string | undefined): string {
  let url = (raw ?? 'http://localhost:3000').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url.replace(/\/api$/i, '')
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL)

const TOKEN_KEY = 'lylo.session'

/** Fired when the API rejects the session, so the app can show the login page. */
export const UNAUTHORIZED_EVENT = 'lylo:unauthorized'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable (private mode): the session only lasts for this page */
  }
}

/** fetch() for the backend API: adds the session token and handles expired sessions. */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(url, { ...init, headers })
  if (res.status === 401 && token) {
    setToken(null)
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return res
}

export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message
  return message ?? `${fallback} (${res.status})`
}
