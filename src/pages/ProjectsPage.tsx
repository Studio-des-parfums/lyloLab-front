import { useEffect, useState } from 'react'
import { Plus, Trash2, Beaker, Copy, Inbox, FileEdit, Play, User, X } from 'lucide-react'
import {
  deleteFormula,
  formulaAuthor,
  listFormulas,
  type FormulaSummary,
} from '../data/formulasApi'
import { useFormula } from '../context/FormulaContext'
import { useAuth } from '../context/AuthContext'
import {
  listFormulationRequests,
  startFormulationRequest,
  type FormulationRequest,
} from '../data/formulationRequestsApi'
import './ProjectsPage.css'

interface ProjectsPageProps {
  onCreateNew: () => void
  onViewFormula: (id: string) => void
  onDuplicateFormula: (id: string) => void
  pendingRequests: number
  onOpenRequests: () => void
}

export default function ProjectsPage({
  onCreateNew,
  onViewFormula,
  onDuplicateFormula,
  pendingRequests,
  onOpenRequests,
}: ProjectsPageProps) {
  const { startNewFormula } = useFormula()
  const { user } = useAuth()
  const [formulas, setFormulas] = useState<FormulaSummary[]>([])
  const [myRequests, setMyRequests] = useState<FormulationRequest[]>([])
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([listFormulas(), listFormulationRequests()])
      .then(([allFormulas, requests]) => {
        // Sections personnelles : uniquement mes formules hors projet client.
        setFormulas(allFormulas.filter((f) => !f.project && f.createdBy?.id === user?.id))
        setMyRequests(requests.filter((r) => r.assignedTo?.id === user?.id))
      })
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

  async function handleStart(request: FormulationRequest) {
    setStartingId(request.id)
    setError(null)
    try {
      await startFormulationRequest(request.id)
      if (request.formulaId) onViewFormula(request.formulaId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setStartingId(null)
    }
  }

  // Demandes prises en charge sans client : « à réaliser » tant qu'elles ne sont pas commencées.
  const requestByFormula = new Map(
    myRequests.filter((r) => r.formulaId && !r.projectId).map((r) => [r.formulaId!, r]),
  )
  const toDo = myRequests.filter((r) => r.status === 'in_progress' && !r.projectId && !r.startedAt)
  const inProgress = formulas.filter(
    (f) => f.status === 'draft' && requestByFormula.get(f.id)?.startedAt,
  )
  const completed = formulas.filter((f) => f.status === 'completed')
  const drafts = formulas.filter((f) => f.status === 'draft' && !requestByFormula.has(f.id))

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div>
          <h1>Mes projets</h1>
          <p>Retrouvez vos formules personnelles finalisées et vos brouillons en cours.</p>
        </div>
        <div className="projects-header-actions">
          <button type="button" className="btn btn-outline" onClick={() => setDraftsOpen(true)}>
            <FileEdit size={16} /> Brouillons ({drafts.length})
          </button>
          <button type="button" className="btn btn-outline requests-entry" onClick={onOpenRequests}>
            <Inbox size={16} /> Demandes de formulation
            {pendingRequests > 0 && <span className="requests-entry-count">{pendingRequests}</span>}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              startNewFormula()
              onCreateNew()
            }}
          >
            <Plus size={16} /> 
          </button>
        </div>
      </div>

      {loading && <p className="projects-status">Chargement...</p>}
      {error && <p className="projects-status projects-status-error">{error}</p>}

      {!loading && !error && (
        <div className="projects-columns projects-columns-3">
          <section className="projects-column">
            <h2>Formules à réaliser ({toDo.length})</h2>
            {toDo.length === 0 ? (
              <p className="projects-empty">Aucune demande à commencer.</p>
            ) : (
              <ul className="todo-list">
                {toDo.map((r) => (
                  <li key={r.id} className="todo-card">
                    <strong>{r.perfumeName || 'Parfum sans nom'}</strong>
                    <span className="todo-meta">
                      <User size={12} /> {r.requesterName}
                      {r.assignedAt ? ` · prise le ${new Date(r.assignedAt).toLocaleDateString()}` : ''}
                    </span>
                    <p className="todo-description">{r.description}</p>
                    <button
                      type="button"
                      className="btn btn-primary todo-start"
                      disabled={startingId !== null}
                      onClick={() => handleStart(r)}
                    >
                      <Play size={14} /> {startingId === r.id ? 'Ouverture...' : 'Commencer'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <FormulaTable
            title={`Formules en cours (${inProgress.length})`}
            formulas={inProgress}
            emptyLabel="Aucune formule en cours."
            onViewFormula={onViewFormula}
            onDuplicateFormula={onDuplicateFormula}
          />
          <FormulaTable
            title={`Formules finalisées (${completed.length})`}
            formulas={completed}
            emptyLabel="Aucune formule finalisée pour le moment."
            onViewFormula={onViewFormula}
            onDuplicateFormula={onDuplicateFormula}
          />
        </div>
      )}

      {draftsOpen && (
        <div className="drafts-overlay" role="dialog" aria-modal="true" aria-label="Brouillons" onClick={() => setDraftsOpen(false)}>
          <div className="drafts-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="drafts-close" onClick={() => setDraftsOpen(false)} aria-label="Fermer">
              <X size={18} />
            </button>
            <FormulaTable
              title={`Mes brouillons (${drafts.length})`}
              formulas={drafts}
              emptyLabel="Aucun brouillon."
              onViewFormula={onViewFormula}
              onDuplicateFormula={onDuplicateFormula}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          </div>
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
