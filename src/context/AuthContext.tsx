import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { UNAUTHORIZED_EVENT, getToken, setToken } from '../data/api'
import {
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  type RegisterPayload,
  type SessionUser,
} from '../data/authApi'

interface AuthContextValue {
  user: SessionUser | null
  /** True while an existing session is being checked at startup. */
  checking: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  /** Re-reads the profile, e.g. after the team was renamed. */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [checking, setChecking] = useState(() => getToken() !== null)

  useEffect(() => {
    if (!getToken()) return
    fetchMe()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiLogin(email, password)
    setToken(session.token)
    setUser(session.user)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await apiRegister(payload)
    setToken(session.token)
    setUser(session.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    setUser(await fetchMe())
  }, [])

  const value = useMemo(
    () => ({ user, checking, login, register, logout, refresh }),
    [user, checking, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
