import { useEffect, useState } from 'react'
import { Plus, Inbox, FileEdit, Play, User, X } from 'lucide-react'
import {
  deleteFormula,
  listFormulas,
  type FormulaSummary,
} from '../data/formulasApi'
import { useFormula } from '../context/FormulaContext'
import FormulaLineageTable from '../components/FormulaLineageTable'
import { countLineages } from '../data/formulasApi'
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
  onOpenLineage: (id: string) => void
  pendingRequests: number
  onOpenRequests: () => void
}

export default function ProjectsPage({
  onCreateNew,
  onViewFormula,
  onOpenLineage,
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
            <FileEdit size={16} /> Brouillons ({countLineages(drafts)})
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
            title="Formules en cours"
            formulas={inProgress}
            emptyLabel="Aucune formule en cours."
          onOpenLineage={onOpenLineage}
          />
          <FormulaTable
            title="Formules finalisées"
            formulas={completed}
            emptyLabel="Aucune formule finalisée pour le moment."
          onOpenLineage={onOpenLineage}
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
              title="Mes brouillons"
              formulas={drafts}
              emptyLabel="Aucun brouillon."
          onOpenLineage={onOpenLineage}
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
  onOpenLineage: (id: string) => void
  onDelete?: (id: string) => void
  deletingId?: string | null
}

function FormulaTable({
  title,
  formulas,
  emptyLabel,
  onOpenLineage,
  onDelete,
  deletingId,
}: FormulaTableProps) {
  return (
    <section className="projects-column">
      <h2>
        {title} ({countLineages(formulas)})
      </h2>
      {formulas.length === 0 ? (
        <p className="projects-empty">{emptyLabel}</p>
      ) : (
        <FormulaLineageTable
          formulas={formulas}
          onOpenFormula={onOpenLineage}
          onDelete={onDelete}
          deletingId={deletingId}
        />
      )}
    </section>
  )
}
