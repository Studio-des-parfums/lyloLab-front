import { useEffect, useState } from 'react'
import { Check, Copy, Link2, Pencil, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  fetchTeam,
  inviteLink,
  regenerateInviteCode,
  removeMember,
  renameTeam,
  updateMemberRole,
  type TeamDetail,
  type TeamRole,
} from '../data/authApi'
import './TeamPage.css'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

const ROLE_LABEL: Record<TeamRole, string> = { admin: 'Administrateur', member: 'Membre' }

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function TeamPage() {
  const { user, refresh } = useAuth()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchTeam()
      .then(setTeam)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
  }, [])

  async function run(action: () => Promise<TeamDetail>) {
    setBusy(true)
    setError(null)
    try {
      setTeam(await action())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy(kind: 'code' | 'link', text: string) {
    if (await copy(text)) {
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  async function saveName() {
    const name = editingName?.trim()
    if (!name) return
    await run(() => renameTeam(name))
    setEditingName(null)
    await refresh()
  }

  if (!team) {
    return (
      <div className="team-page">
        <p className={error ? 'team-status team-status-error' : 'team-status'}>
          {error ?? 'Chargement...'}
        </p>
      </div>
    )
  }

  return (
    <div className="team-page">
      <div className="team-header">
        {editingName !== null ? (
          <div className="team-name-edit">
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') setEditingName(null)
              }}
            />
            <button type="button" onClick={saveName} disabled={busy} aria-label="Enregistrer">
              <Check size={16} />
            </button>
            <button type="button" onClick={() => setEditingName(null)} aria-label="Annuler">
              <X size={16} />
            </button>
          </div>
        ) : (
          <h1>
            {team.name}
            {isAdmin && (
              <button
                type="button"
                className="team-icon-btn"
                onClick={() => setEditingName(team.name)}
                aria-label="Renommer l'équipe"
              >
                <Pencil size={15} />
              </button>
            )}
          </h1>
        )}
        <p>
          Toutes les matières premières, clients, projets et formules de l'application sont
          partagés entre les membres de cette équipe.
        </p>
      </div>

      {error && <p className="team-status team-status-error">{error}</p>}

      {isAdmin && team.inviteCode && (
        <section className="team-card">
          <h2>Inviter des collègues</h2>
          <p className="team-card-hint">
            Partagez ce code ou ce lien : la personne crée son compte avec et rejoint
            directement l'équipe.
          </p>
          <div className="team-invite">
            <code className="team-invite-code">{team.inviteCode}</code>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleCopy('code', team.inviteCode!)}
            >
              {copied === 'code' ? <Check size={15} /> : <Copy size={15} />}
              {copied === 'code' ? 'Copié' : 'Copier le code'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleCopy('link', inviteLink(team.inviteCode!))}
            >
              {copied === 'link' ? <Check size={15} /> : <Link2 size={15} />}
              {copied === 'link' ? 'Copié' : 'Copier le lien'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => run(regenerateInviteCode)}
              disabled={busy}
              title="L'ancien code ne fonctionnera plus"
            >
              <RefreshCw size={15} /> Nouveau code
            </button>
          </div>
        </section>
      )}

      <section className="team-card">
        <h2>Membres ({team.members.length})</h2>
        <ul className="team-members">
          {team.members.map((member) => {
            const isSelf = member.id === user?.id
            return (
              <li key={member.id} className="team-member">
                <span className="team-avatar" aria-hidden>
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <span className="team-member-main">
                  <span className="team-member-name">
                    {member.name}
                    {isSelf && <span className="team-tag">Vous</span>}
                  </span>
                  <span className="team-member-meta">
                    {member.email} · depuis le {dateFormat.format(new Date(member.createdAt))}
                  </span>
                </span>

                {isAdmin && !isSelf ? (
                  <select
                    className="team-role-select"
                    value={member.role}
                    disabled={busy}
                    onChange={(e) =>
                      run(() => updateMemberRole(member.id, e.target.value as TeamRole))
                    }
                    aria-label={`Rôle de ${member.name}`}
                  >
                    <option value="member">{ROLE_LABEL.member}</option>
                    <option value="admin">{ROLE_LABEL.admin}</option>
                  </select>
                ) : (
                  <span className={`team-role team-role-${member.role}`}>
                    {member.role === 'admin' && <ShieldCheck size={13} />}
                    {ROLE_LABEL[member.role]}
                  </span>
                )}

                {isAdmin && !isSelf && (
                  confirmRemoveId === member.id ? (
                    <span className="team-remove-confirm">
                      <button
                        type="button"
                        className="team-remove-yes"
                        disabled={busy}
                        onClick={async () => {
                          await run(() => removeMember(member.id))
                          setConfirmRemoveId(null)
                        }}
                      >
                        Retirer
                      </button>
                      <button
                        type="button"
                        className="team-icon-btn"
                        onClick={() => setConfirmRemoveId(null)}
                        aria-label="Annuler"
                      >
                        <X size={15} />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="team-icon-btn"
                      onClick={() => setConfirmRemoveId(member.id)}
                      aria-label={`Retirer ${member.name} de l'équipe`}
                      title="Retirer de l'équipe"
                    >
                      <Trash2 size={15} />
                    </button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
