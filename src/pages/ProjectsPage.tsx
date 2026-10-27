import { useEffect, useState } from 'react'
import { Plus, Trash2, Beaker, Copy } from 'lucide-react'
import {
  deleteFormula,
  formulaAuthor,
  listFormulas,
  type FormulaSummary,
} from '../data/formulasApi'
import { useFormula } from '../context/FormulaContext'
import './ProjectsPage.css'

interface ProjectsPageProps {
  onCreateNew: () => void
  onViewFormula: (id: string) => void
  onDuplicateFormula: (id: string) => void
}

export default function ProjectsPage({
  onCreateNew,
  onViewFormula,
  onDuplicateFormula,
}: ProjectsPageProps) {
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
      .then((result) => setFormulas(result.filter((f) => !f.project)))
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
          <p>Retrouvez vos formules personnelles finalisées et vos brouillons en cours.</p>
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
        <div className="projects-columns">
          <FormulaTable
            title={`Formules finalisées (${completed.length})`}
            formulas={completed}
            emptyLabel="Aucune formule finalisée pour le moment."
            onViewFormula={onViewFormula}
            onDuplicateFormula={onDuplicateFormula}
          />
          <FormulaTable
            title={`Brouillons (${drafts.length})`}
            formulas={drafts}
            emptyLabel="Aucun brouillon en cours."
            onViewFormula={onViewFormula}
            onDuplicateFormula={onDuplicateFormula}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        </div>
      )}
    </div>
  )
}

interface FormulaTableProps {
  title: string
  formulas: FormulaSummary[]
  emptyLabel: string
  onViewFormula: (id: string) => void
  onDuplicateFormula: (id: string) => void
  onDelete?: (id: string) => void
  deletingId?: string | null
}

function FormulaTable({
  title,
  formulas,
  emptyLabel,
  onViewFormula,
  onDuplicateFormula,
  onDelete,
  deletingId,
}: FormulaTableProps) {
  return (
    <section className="projects-column">
      <h2>{title}</h2>
      {formulas.length === 0 ? (
        <p className="projects-empty">{emptyLabel}</p>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Créée par</th>
              <th>Date</th>
              <th />
              {onDelete && <th />}
            </tr>
          </thead>
          <tbody>
            {formulas.map((f) => (
              <tr key={f.id} onClick={() => onViewFormula(f.id)}>
                <td>
                  <span className="projects-table-name">{f.name}</span>
                  {f.materializedAs && (
                    <span className="project-card-tag">
                      <Beaker size={11} /> Transformée en matière première
                    </span>
                  )}
                </td>
                <td className="projects-table-author">{formulaAuthor(f) ?? '—'}</td>
                <td className="projects-table-date">
                  {new Date(f.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <button
                    type="button"
                    className="project-card-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicateFormula(f.id)
                    }}
                    aria-label="Dupliquer en nouvelle version"
                    title="Dupliquer en nouvelle version"
                  >
                    <Copy size={16} />
                  </button>
                </td>
                {onDelete && (
                  <td>
                    <button
                      type="button"
                      className="project-card-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(f.id)
                      }}
                      disabled={deletingId === f.id}
                      aria-label="Supprimer le brouillon"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
