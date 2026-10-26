import { useEffect, useState, type FormEvent } from 'react'
import { LogIn, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchInviteInfo } from '../data/authApi'
import './AuthPage.css'

type Mode = 'login' | 'register'
type TeamChoice = 'join' | 'create'

const MIN_PASSWORD_LENGTH = 8
const INVITE_CODE_LENGTH = 8

const normalizeCode = (code: string) => code.replace(/[\s-]/g, '').toUpperCase()

/** Code from an invite link (?invite=XXXX), which opens the sign-up form directly. */
function inviteFromUrl(): string {
  return normalizeCode(new URLSearchParams(window.location.search).get('invite') ?? '')
}

export default function AuthPage() {
  const { login, register } = useAuth()
  const [initialInvite] = useState(inviteFromUrl)
  const [mode, setMode] = useState<Mode>(initialInvite ? 'register' : 'login')
  const [teamChoice, setTeamChoice] = useState<TeamChoice>('join')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState(initialInvite)
  const [teamName, setTeamName] = useState('')
  const [inviteTeam, setInviteTeam] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Show which team a complete code belongs to before the person signs up.
  const code = normalizeCode(inviteCode)
  useEffect(() => {
    if (mode !== 'register' || teamChoice !== 'join' || code.length !== INVITE_CODE_LENGTH) return
    let cancelled = false
    fetchInviteInfo(code)
      .then((info) => {
        if (cancelled) return
        setInviteTeam(info.teamName)
        setInviteError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setInviteTeam(null)
        setInviteError(err instanceof Error ? err.message : "Code d'invitation inconnu")
      })
    return () => {
      cancelled = true
    }
  }, [code, mode, teamChoice])

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`)
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({
          name,
          email,
          password,
          ...(teamChoice === 'join' ? { inviteCode: code } : { teamName }),
        })
        // Drop ?invite= so a reload doesn't reopen the sign-up form.
        if (initialInvite) window.history.replaceState(null, '', window.location.pathname)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  const codeComplete = code.length === INVITE_CODE_LENGTH
  const canSubmit =
    mode === 'login'
      ? email.trim() !== '' && password !== ''
      : name.trim() !== '' &&
        email.trim() !== '' &&
        password !== '' &&
        (teamChoice === 'join' ? codeComplete && inviteTeam !== null : teamName.trim() !== '')

  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <span className="auth-brand-title">Lylo-Lab</span>
        <span className="auth-brand-sub">PARIS</span>
        <p className="auth-brand-tagline">L'art, la science, l'émotion.</p>
      </aside>

      <main className="auth-main">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Se connecter
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              Créer un compte
            </button>
          </div>

          {mode === 'register' && (
            <label className="auth-field">
              Nom
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}

          <label className="auth-field">
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="auth-field">
            Mot de passe
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'register' && (
              <span className="auth-hint">{MIN_PASSWORD_LENGTH} caractères minimum.</span>
            )}
          </label>

          {mode === 'register' && (
            <fieldset className="auth-team">
              <legend>Équipe</legend>
              <div className="auth-team-choice">
                <button
                  type="button"
                  className={teamChoice === 'join' ? 'active' : ''}
                  onClick={() => setTeamChoice('join')}
                >
                  Rejoindre une équipe
                </button>
                <button
                  type="button"
                  className={teamChoice === 'create' ? 'active' : ''}
                  onClick={() => setTeamChoice('create')}
                >
                  Créer une équipe
                </button>
              </div>

              {teamChoice === 'join' ? (
                <label className="auth-field">
                  Code d'invitation
                  <input
                    type="text"
                    className="auth-code-input"
                    placeholder="ex. AB12CD34"
                    maxLength={INVITE_CODE_LENGTH + 2}
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value)
                      setInviteTeam(null)
                      setInviteError(null)
                    }}
                  />
                  {codeComplete && inviteTeam && (
                    <span className="auth-hint auth-hint-ok">
                      <Users size={13} /> Vous rejoindrez l'équipe « {inviteTeam} ».
                    </span>
                  )}
                  {codeComplete && inviteError && (
                    <span className="auth-hint auth-hint-error">{inviteError}</span>
                  )}
                  {!codeComplete && (
                    <span className="auth-hint">
                      Demandez le code à l'administrateur de votre équipe.
                    </span>
                  )}
                </label>
              ) : (
                <label className="auth-field">
                  Nom de l'équipe
                  <input
                    type="text"
                    placeholder="ex. Laboratoire Lylo"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                  <span className="auth-hint">
                    Vous en serez l'administrateur et pourrez inviter vos collègues.
                  </span>
                </label>
              )}
            </fieldset>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={!canSubmit || submitting}>
            {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {submitting
              ? 'Patientez…'
              : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
          </button>
        </form>
      </main>
    </div>
  )
}
