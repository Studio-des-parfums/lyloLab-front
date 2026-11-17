import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, StickyNote, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFormula } from '../context/FormulaContext'
import { addNote, deleteNote, listNotes, type FormulaNote } from '../data/formulaCollabApi'
import './FormulaNotes.css'

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

/** Notes datées et signées sur la version ouverte (essais, ressentis, pistes). */
export default function FormulaNotes() {
  const { formulaId, formulaVersion, formulaCode } = useFormula()
  const { user } = useAuth()
  const [notes, setNotes] = useState<FormulaNote[]>([])
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!formulaId) return
    let cancelled = false
    listNotes(formulaId)
      .then((list) => {
        if (!cancelled) setNotes(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [formulaId])

  // Une formule jamais enregistrée n'a pas encore de version sur laquelle noter.
  if (!formulaId) return null

  async function submit() {
    const body = draft.trim()
    if (!body || !formulaId) return
    setBusy(true)
    setError(null)
    try {
      const note = await addNote(formulaId, body)
      setNotes((prev) => [note, ...prev])
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function remove(noteId: string) {
    if (!formulaId) return
    try {
      await deleteNote(formulaId, noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  return (
    <div className="formula-notes">
      <button type="button" className="formula-notes-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <StickyNote size={14} /> Notes{formulaVersion ? ` de ${formulaCode ?? `v${formulaVersion}`}` : ''} ({notes.length})
      </button>
      {open && (
        <div className="formula-notes-body">
          <div className="formula-notes-form">
            <textarea
              rows={2}
              maxLength={5000}
              placeholder="Ex. : trop sucré en fond, baisser la vanille de 1 %"
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
          {error && <p className="formula-notes-error">{error}</p>}
          {notes.length === 0 ? (
            <p className="formula-notes-empty">Aucune note sur cette version.</p>
          ) : (
            <ul className="formula-notes-list">
              {notes.map((n) => (
                <li key={n.id}>
                  <p>{n.body}</p>
                  <span className="formula-notes-meta">
                    {n.author?.name ?? n.authorName} · {dateTime.format(new Date(n.createdAt))}
                    {(n.author?.id === user?.id || user?.role === 'admin') && (
                      <button type="button" onClick={() => remove(n.id)} aria-label="Supprimer la note" title="Supprimer la note">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
