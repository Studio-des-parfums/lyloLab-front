import { useEffect, useRef, useState } from 'react'
import { AtSign, Bell, Inbox } from 'lucide-react'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../data/formulaCollabApi'
import { versionLabel } from '../data/formulasApi'

interface Props {
  pendingRequests: number
  onOpenRequests: () => void
  onOpenFormula: (formulaId: string, projectId: string | null) => void
}

const time = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

/** Cloche : demandes de formulation en attente (équipe) et mentions (personnelles). */
export default function NotificationBell({ pendingRequests, onOpenRequests, onOpenFormula }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = () => listNotifications().then(setNotifications).catch(() => {})
    load()
    const timer = setInterval(load, 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const unread = notifications.filter((n) => !n.readAt).length
  const total = unread + pendingRequests

  async function openNotification(n: AppNotification) {
    setOpen(false)
    if (!n.readAt) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
      markNotificationRead(n.id).catch(() => {})
    }
    if (n.formula) onOpenFormula(n.formula.id, n.formula.projectId)
  }

  async function readAll() {
    setNotifications((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })))
    markAllNotificationsRead().catch(() => {})
  }

  return (
    <div className="bell" ref={rootRef}>
      <button
        type="button"
        className="topbar-bell"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Notifications : ${total}`}
        title="Notifications"
      >
        <Bell size={17} />
        {total > 0 && <span className="topbar-bell-count">{total > 9 ? '9+' : total}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="menu">
          <div className="bell-header">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="bell-read-all" onClick={readAll}>
                Tout marquer comme lu
              </button>
            )}
          </div>

          {pendingRequests > 0 && (
            <button
              type="button"
              className="bell-item bell-item-unread"
              onClick={() => {
                setOpen(false)
                onOpenRequests()
              }}
            >
              <span className="bell-icon"><Inbox size={15} /></span>
              <span className="bell-text">
                <strong>{pendingRequests} demande{pendingRequests > 1 ? 's' : ''} de formulation</strong> en attente de prise en charge
              </span>
            </button>
          )}

          {notifications.length === 0 && pendingRequests === 0 && (
            <p className="bell-empty">Aucune notification.</p>
          )}

          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`bell-item${n.readAt ? '' : ' bell-item-unread'}`}
              onClick={() => openNotification(n)}
            >
              <span className="bell-icon"><AtSign size={15} /></span>
              <span className="bell-text">
                <strong>{n.actorName}</strong> vous a mentionné
                {n.formula ? <> sur <strong>{n.formula.name}</strong> ({versionLabel(n.formula)})</> : null}
                <span className="bell-excerpt">« {n.excerpt} »</span>
                <span className="bell-time">{time.format(new Date(n.createdAt))}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
