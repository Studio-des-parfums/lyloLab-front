import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AtSign, Minus, Send, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFormula } from '../context/FormulaContext'
import { fetchTeam, type TeamMember } from '../data/authApi'
import { listMessages, postMessage, type FormulaMessage } from '../data/formulaCollabApi'

interface Props {
  visible: boolean
  tabs: ReactNode
  onClose: () => void
}

const time = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

/** Met en valeur les @Nom des membres dans un message. */
function renderBody(body: string, members: TeamMember[]): ReactNode[] {
  const names = members.map((m) => m.name).sort((a, b) => b.length - a.length)
  if (names.length === 0) return [body]
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = body.split(new RegExp(`(@(?:${escaped.join('|')}))`, 'g'))
  return parts.map((part, i) =>
    part.startsWith('@') && names.includes(part.slice(1)) ? (
      <strong key={i} className="team-chat-mention">{part}</strong>
    ) : (
      part
    ),
  )
}

/** Discussion d'équipe de la formule (toutes versions), avec @mentions notifiées. */
export default function FormulaTeamChat({ visible, tabs, onClose }: Props) {
  const { formulaId, formulaName } = useFormula()
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [messages, setMessages] = useState<FormulaMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchTeam()
      .then((team) => setMembers(team.members))
      .catch(() => {})
  }, [])

  // Rafraîchit le fil tant que l'onglet est ouvert.
  useEffect(() => {
    if (!visible || !formulaId) return
    let cancelled = false
    const load = () =>
      listMessages(formulaId)
        .then((list) => {
          if (!cancelled) setMessages(list)
        })
        .catch(() => {})
    load()
    const timer = setInterval(load, 10_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [visible, formulaId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, visible])

  if (!visible) return null

  const others = members.filter((m) => m.id !== user?.id)

  function mention(member: TeamMember) {
    setDraft((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${member.name} `)
    inputRef.current?.focus()
  }

  async function send() {
    const body = draft.trim()
    if (!body || !formulaId) return
    // Toute personne citée par @Nom dans le texte est notifiée.
    const mentionIds = others.filter((m) => body.includes(`@${m.name}`)).map((m) => m.id)
    setSending(true)
    setError(null)
    try {
      const message = await postMessage(formulaId, body, mentionIds)
      setMessages((prev) => [...prev, message])
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="assistant-panel" role="dialog" aria-label="Discussion d'équipe">
      <div className="assistant-header">
        <span className="assistant-avatar">
          <Users size={16} />
        </span>
        <div className="assistant-header-text">
          <span className="assistant-title">Discussion d'équipe</span>
          <span className="assistant-subtitle">{formulaName} · toutes versions</span>
        </div>
        <button type="button" className="assistant-icon-btn" onClick={onClose} aria-label="Réduire">
          <Minus size={16} />
        </button>
      </div>

      {tabs}

      {others.length > 0 && (
        <div className="team-chat-members" aria-label="Membres de l'équipe">
          {others.map((m) => (
            <button key={m.id} type="button" className="team-chat-member" onClick={() => mention(m)} title={`Mentionner ${m.name}`}>
              <span className="team-chat-avatar">{m.name.charAt(0).toUpperCase()}</span>
              {m.name}
              <AtSign size={11} />
            </button>
          ))}
        </div>
      )}

      <div className="assistant-messages" ref={listRef}>
        {!formulaId ? (
          <p className="team-chat-empty">Enregistrez la formule pour ouvrir sa discussion d'équipe.</p>
        ) : messages.length === 0 ? (
          <p className="team-chat-empty">
            Aucun message. Cliquez sur un collègue ci-dessus pour lui demander son avis : il sera notifié.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.author?.id === user?.id
            return (
              <div key={m.id} className={`team-chat-message${mine ? ' mine' : ''}`}>
                {!mine && <span className="team-chat-author">{m.author?.name ?? m.authorName}</span>}
                <div className={`assistant-bubble ${mine ? 'assistant-bubble-user' : 'assistant-bubble-ai'}`}>
                  {renderBody(m.body, members)}
                </div>
                <span className="team-chat-time">{time.format(new Date(m.createdAt))}</span>
              </div>
            )
          })
        )}
        {error && <p className="assistant-error">{error}</p>}
      </div>

      <form
        className="assistant-composer"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          placeholder={formulaId ? 'Message à l’équipe… (@ pour mentionner)' : 'Formule non enregistrée'}
          disabled={!formulaId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button type="submit" className="assistant-send" disabled={sending || !draft.trim() || !formulaId} aria-label="Envoyer">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
