import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  addMaterialNote,
  deleteMaterialNote,
  getMaterialNotes,
  type MaterialNote,
} from '../data/libraryApi'

/** Material sheet: each perfumer's impressions, shared with the team. */
export default function MaterialNotesSection({ materialId }: { materialId: string }) {
  const [notes, setNotes] = useState<MaterialNote[] | null>(null)
  const [text, setText] = useState('')
  const [rating, setRating] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setNotes(null)
    getMaterialNotes(materialId)
      .then(setNotes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
  }, [materialId])

  async function run(action: () => Promise<MaterialNote[]>) {
    setBusy(true)
    setError(null)
    try {
      setNotes(await action())
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="detail-regulatory">
      <h4>Notes des parfumeurs</h4>
      {notes && notes.length === 0 && (
        <p className="detail-value-empty">Aucune impression partagée pour le moment.</p>
      )}
      {notes && notes.length > 0 && (
        <ul className="material-notes">
          {notes.map((n) => (
            <li key={n.id}>
              <p>
                {n.rating ? <span className="material-notes-stars">{'★'.repeat(n.rating)} </span> : null}
                {n.text}
              </p>
              <span className="material-notes-meta">
                {n.authorName} · {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                <button
                  type="button"
                  aria-label="Supprimer la note"
                  title="Supprimer"
                  disabled={busy}
                  onClick={() => run(() => deleteMaterialNote(n.id))}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="material-notes-form">
        <textarea
          rows={2}
          placeholder="Votre impression : odeur, évolution sur mouillette, usages, associations…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="material-notes-row">
          <span className="material-notes-rating" aria-label="Note sur 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={n <= rating ? 'active' : undefined}
                aria-label={`${n} sur 5`}
                onClick={() => setRating(n === rating ? 0 : n)}
              >
                ★
              </button>
            ))}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !text.trim()}
            onClick={async () => {
              if (await run(() => addMaterialNote(materialId, { text: text.trim(), rating: rating || null }))) {
                setText('')
                setRating(0)
              }
            }}
          >
            Partager
          </button>
        </div>
      </div>
      {error && <p className="clients-status clients-status-error">{error}</p>}
    </div>
  )
}
