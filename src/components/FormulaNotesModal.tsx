import { useEffect, useState } from 'react'
import { StickyNote, X } from 'lucide-react'
import { addNote, listNotes, type FormulaNote } from '../data/formulaCollabApi'
import { versionLabel } from '../data/formulasApi'
import './FormulaNotesModal.css'

interface Version {
  id: string
  name: string
  version: number
  code: string | null
}

interface Props {
  /** Versions de la formule, de la plus récente à la plus ancienne. */
  versions: Version[]
  onClose: () => void
  /** Prévient la liste qu'une note a été ajoutée (compteur). */
  onAdded?: (formulaId: string) => void
}

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

/** Notes de toutes les versions d'une formule, regroupées par version. */
export default function FormulaNotesModal({ versions, onClose, onAdded }: Props) {
  const [notesByVersion, setNotesByVersion] = useState<Record<string, FormulaNote[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const latest = versions[0]

  useEffect(() => {
    let cancelled = false
    Promise.all(versions.map((v) => listNotes(v.id).then((notes) => [v.id, notes] as const)))
      .then((entries) => {
        if (!cancelled) setNotesByVersion(Object.fromEntries(entries))
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur inconnue')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [versions])

  async function submit() {
    const body = draft.trim()
    if (!body) return
    setBusy(true)
    setError(null)
    try {
      const note = await addNote(latest.id, body)
      setNotesByVersion((prev) => ({ ...prev, [latest.id]: [note, ...(prev[latest.id] ?? [])] }))
      setDraft('')
      onAdded?.(latest.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  const total = Object.values(notesByVersion).reduce((sum, list) => sum + list.length, 0)

  return (
    <div className="lineage-overlay" role="dialog" aria-modal="true" aria-label="Notes de la formule" onClick={onClose}>
      <div className="lineage-modal notes-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lineage-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>
        <h2>
          <StickyNote size={18} /> Notes de « {latest.name} »
        </h2>

        <div className="notes-modal-form">
          <textarea
            rows={2}
            maxLength={5000}
            placeholder={`Ajouter une note sur ${versionLabel(latest)}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
            }}
          />
          <button type="button" className="btn btn-outline" onClick={submit} disabled={busy || !draft.trim()}>
            Ajouter
          </button>
        </div>

        {error && <p className="notes-modal-error">{error}</p>}
        {loading ? (
          <p className="notes-modal-empty">Chargement...</p>
        ) : total === 0 ? (
          <p className="notes-modal-empty">Aucune note sur cette formule.</p>
        ) : (
          versions.map((v) => {
            const notes = notesByVersion[v.id] ?? []
            if (notes.length === 0) return null
            return (
              <section key={v.id} className="notes-modal-version">
                <h3>
                  <span className="lineage-badge">{versionLabel(v)}</span>
                  {v.id === latest.id && <span className="lineage-current">Dernière version</span>}
                </h3>
                <ul>
                  {notes.map((n) => (
                    <li key={n.id}>
                      <p>{n.body}</p>
                      <span>
                        {n.author?.name ?? n.authorName} · {dateTime.format(new Date(n.createdAt))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
