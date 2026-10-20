import { useEffect, useState } from 'react'
import { FlaskConical, Plus, Trash2 } from 'lucide-react'
import { deleteFormula, listFormulas, type FormulaSummary } from '../data/formulasApi'
import { useFormula } from '../context/FormulaContext'
import './ProjectsPage.css'

interface ProjectsPageProps {
  onCreateNew: () => void
  onViewFormula: (id: string) => void
}

export default function ProjectsPage({ onCreateNew, onViewFormula }: ProjectsPageProps) {
  const { startNewFormula } = useFormula()
  const [formulas, setFormulas] = useState<FormulaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    setError(null)
    listFormulas()
      .then(setFormulas)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setLoading(false))
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteFormula(id)
      setFormulas((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDeletingId(null)
    }
  }

  const completed = formulas.filter((f) => f.status === 'completed')
  const drafts = formulas.filter((f) => f.status === 'draft')

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div>
          <h1>Mes projets</h1>
          <p>Retrouvez vos formules finalisées et vos brouillons en cours.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            startNewFormula()
            onCreateNew()
          }}
        >
          <Plus size={16} /> Nouvelle formule
        </button>
      </div>

      {loading && <p className="projects-status">Chargement...</p>}
      {error && <p className="projects-status projects-status-error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="projects-section">
            <h2>Formules ({completed.length})</h2>
            {completed.length === 0 ? (
              <p className="projects-empty">Aucune formule finalisée pour le moment.</p>
            ) : (
              <div className="projects-grid">
                {completed.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="project-card project-card-clickable"
                    onClick={() => onViewFormula(f.id)}
                  >
                    <FlaskConical size={20} />
                    <span className="project-card-name">{f.name}</span>
                    <span className="project-card-date">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="projects-section">
            <h2>Brouillons ({drafts.length})</h2>
            {drafts.length === 0 ? (
              <p className="projects-empty">Aucun brouillon en cours.</p>
            ) : (
              <div className="projects-grid">
                {drafts.map((f) => (
                  <div
                    key={f.id}
                    className="project-card project-card-draft project-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onViewFormula(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onViewFormula(f.id)
                    }}
                  >
                    <FlaskConical size={20} />
                    <span className="project-card-name">{f.name}</span>
                    <span className="project-card-date">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      className="project-card-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(f.id)
                      }}
                      disabled={deletingId === f.id}
                      aria-label="Supprimer le brouillon"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
