import { useEffect, useState } from 'react'
import { ArrowLeft, Beaker, Briefcase, Copy, Plus, User } from 'lucide-react'
import {
  getClient,
  getClientDisplayName,
  getProject,
  listClients,
  updateClient,
  updateProject,
  type Client,
  type ProjectDetail,
} from '../data/clientsApi'
import { useFormula } from '../context/FormulaContext'
import './ClientsPage.css'

interface ClientsPageProps {
  onViewFormula: (id: string, projectId: string) => void
  onCreateFormula: (projectId: string) => void
  onDuplicateFormula: (id: string, projectId: string) => void
  openProjectId?: string | null
}

type View =
  | { name: 'list' }
  | { name: 'client'; clientId: string }
  | { name: 'project'; projectId: string }

export default function ClientsPage({
  onViewFormula,
  onCreateFormula,
  onDuplicateFormula,
  openProjectId,
}: ClientsPageProps) {
  const [view, setView] = useState<View>(
    openProjectId ? { name: 'project', projectId: openProjectId } : { name: 'list' },
  )

  useEffect(() => {
    if (openProjectId) setView({ name: 'project', projectId: openProjectId })
  }, [openProjectId])

  if (view.name === 'client') {
    return (
      <ClientDetail
        clientId={view.clientId}
        onBack={() => setView({ name: 'list' })}
        onOpenProject={(projectId) => setView({ name: 'project', projectId })}
      />
    )
  }

  if (view.name === 'project') {
    return (
      <ProjectDetailView
        projectId={view.projectId}
        onBack={(clientId) => setView({ name: 'client', clientId })}
        onViewFormula={onViewFormula}
        onCreateFormula={onCreateFormula}
        onDuplicateFormula={onDuplicateFormula}
      />
    )
  }

  return <ClientsList onOpenClient={(clientId) => setView({ name: 'client', clientId })} />
}

const EMPTY_CLIENT_FORM = {
  company: '',
  contactFirstName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
}

const EMPTY_PROJECT_FORM = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
}

function ClientsList({ onOpenClient }: { onOpenClient: (clientId: string) => void }) {
  const { createClientAndSelect } = useFormula()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_CLIENT_FORM)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    setError(null)
    listClients()
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setLoading(false))
  }

  async function handleCreate() {
    setBusy(true)
    try {
      const client = await createClientAndSelect({
        company: form.company.trim() || undefined,
        contactFirstName: form.contactFirstName.trim() || undefined,
        contactLastName: form.contactLastName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      })
      setClients((prev) =>
        [...prev, client].sort((a, b) =>
          getClientDisplayName(a).localeCompare(getClientDisplayName(b)),
        ),
      )
      setCreating(false)
      setForm(EMPTY_CLIENT_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="clients-page">
      <div className="clients-header">
        <div>
          <h1>Clients</h1>
          <p>Gérez vos clients et leurs projets de création sur mesure.</p>
        </div>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Nouveau client
          </button>
        )}
      </div>

      {creating && (
        <div className="client-detail-form">
          <label>
            Société
            <input
              type="text"
              autoFocus
              placeholder="ex: Coca-Cola"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </label>
          <div className="client-detail-form-row">
            <label>
              Prénom du contact
              <input
                type="text"
                value={form.contactFirstName}
                onChange={(e) => setForm((f) => ({ ...f, contactFirstName: e.target.value }))}
              />
            </label>
            <label>
              Nom du contact
              <input
                type="text"
                value={form.contactLastName}
                onChange={(e) => setForm((f) => ({ ...f, contactLastName: e.target.value }))}
              />
            </label>
          </div>
          <label>
            Email du contact
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </label>
          <label>
            Téléphone du contact
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
            />
          </label>
          <div className="client-detail-form-actions">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={handleCreate}>
              Créer
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setCreating(false)
                setForm(EMPTY_CLIENT_FORM)
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading && <p className="clients-status">Chargement...</p>}
      {error && <p className="clients-status clients-status-error">{error}</p>}

      {!loading && !error && (
        <>
          {clients.length === 0 ? (
            <p className="clients-empty">Aucun client pour le moment.</p>
          ) : (
            <div className="clients-grid">
              {clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="client-card"
                  onClick={() => onOpenClient(c.id)}
                >
                  <div className="client-card-avatar">
                    <User size={20} />
                  </div>
                  <span className="client-card-name">{getClientDisplayName(c)}</span>
                  {c.company && (c.contactFirstName || c.contactLastName) && (
                    <span className="client-card-company">
                      {`${c.contactFirstName ?? ''} ${c.contactLastName ?? ''}`.trim()}
                    </span>
                  )}
                  <span className="client-card-projects">
                    {c.projects.length} projet{c.projects.length > 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ClientDetail({
  clientId,
  onBack,
  onOpenProject,
}: {
  clientId: string
  onBack: () => void
  onOpenProject: (projectId: string) => void
}) {
  const { createProjectAndSelect } = useFormula()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    company: '',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
  })
  const [saving, setSaving] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [clientId])

  function load() {
    setLoading(true)
    setError(null)
    getClient(clientId)
      .then((c) => {
        setClient(c)
        setForm({
          company: c.company ?? '',
          contactFirstName: c.contactFirstName ?? '',
          contactLastName: c.contactLastName ?? '',
          contactEmail: c.contactEmail ?? '',
          contactPhone: c.contactPhone ?? '',
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setLoading(false))
  }

  async function handleSaveInfo() {
    setSaving(true)
    try {
      const updated = await updateClient(clientId, {
        company: form.company.trim() || undefined,
        contactFirstName: form.contactFirstName.trim() || undefined,
        contactLastName: form.contactLastName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      })
      setClient((prev) => (prev ? { ...prev, ...updated } : updated))
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateProject() {
    if (!projectForm.name.trim()) return
    setBusy(true)
    try {
      await createProjectAndSelect(
        {
          name: projectForm.name.trim(),
          description: projectForm.description.trim() || undefined,
          startDate: projectForm.startDate || undefined,
          endDate: projectForm.endDate || undefined,
        },
        clientId,
      )
      setProjectForm(EMPTY_PROJECT_FORM)
      setCreatingProject(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="clients-status">Chargement...</p>
  if (error) return <p className="clients-status clients-status-error">{error}</p>
  if (!client) return null

  return (
    <div className="clients-page">
      <button type="button" className="btn btn-outline clients-back" onClick={onBack}>
        <ArrowLeft size={16} /> Retour aux clients
      </button>

      <div className="client-detail-header">
        <h1>{getClientDisplayName(client)}</h1>
        {!editing && (
          <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>
            Modifier les informations
          </button>
        )}
      </div>

      {editing ? (
        <div className="client-detail-form">
          <label>
            Société
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </label>
          <div className="client-detail-form-row">
            <label>
              Prénom du contact
              <input
                type="text"
                value={form.contactFirstName}
                onChange={(e) => setForm((f) => ({ ...f, contactFirstName: e.target.value }))}
              />
            </label>
            <label>
              Nom du contact
              <input
                type="text"
                value={form.contactLastName}
                onChange={(e) => setForm((f) => ({ ...f, contactLastName: e.target.value }))}
              />
            </label>
          </div>
          <label>
            Email du contact
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </label>
          <label>
            Téléphone du contact
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
            />
          </label>
          <div className="client-detail-form-actions">
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSaveInfo}>
              Enregistrer
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <dl className="client-detail-info">
          <div>
            <dt>Société</dt>
            <dd>{client.company || '—'}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              {client.contactFirstName || client.contactLastName
                ? `${client.contactFirstName ?? ''} ${client.contactLastName ?? ''}`.trim()
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{client.contactEmail || '—'}</dd>
          </div>
          <div>
            <dt>Téléphone</dt>
            <dd>{client.contactPhone || '—'}</dd>
          </div>
        </dl>
      )}

      <div className="client-detail-projects">
        <div className="clients-header">
          <h2>Projets</h2>
          {!creatingProject && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreatingProject(true)}
            >
              <Plus size={16} /> Nouveau projet
            </button>
          )}
        </div>

        {creatingProject && (
          <div className="client-detail-form">
            <label>
              Nom du projet
              <input
                type="text"
                autoFocus
                placeholder="ex: 20ème anniversaire"
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label>
              Date de début
              <input
                type="date"
                value={projectForm.startDate}
                onChange={(e) => setProjectForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </label>
            <label>
              Date de fin
              <input
                type="date"
                value={projectForm.endDate}
                onChange={(e) => setProjectForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </label>
            <div className="client-detail-form-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !projectForm.name.trim()}
                onClick={handleCreateProject}
              >
                Créer
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setCreatingProject(false)
                  setProjectForm(EMPTY_PROJECT_FORM)
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {client.projects.length === 0 ? (
          <p className="clients-empty">Aucun projet pour ce client.</p>
        ) : (
          <div className="clients-grid">
            {client.projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className="client-card"
                onClick={() => onOpenProject(p.id)}
              >
                <div className="client-card-avatar">
                  <Briefcase size={20} />
                </div>
                <span className="client-card-name">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectDetailView({
  projectId,
  onBack,
  onViewFormula,
  onCreateFormula,
  onDuplicateFormula,
}: {
  projectId: string
  onBack: (clientId: string) => void
  onViewFormula: (id: string, projectId: string) => void
  onCreateFormula: (projectId: string) => void
  onDuplicateFormula: (id: string, projectId: string) => void
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ description: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [projectId])

  function load() {
    setLoading(true)
    setError(null)
    getProject(projectId)
      .then((p) => {
        setProject(p)
        setForm({
          description: p.description ?? '',
          startDate: p.startDate ? p.startDate.slice(0, 10) : '',
          endDate: p.endDate ? p.endDate.slice(0, 10) : '',
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setLoading(false))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateProject(projectId, {
        description: form.description,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      })
      setProject(updated)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="clients-status">Chargement...</p>
  if (error) return <p className="clients-status clients-status-error">{error}</p>
  if (!project) return null

  return (
    <div className="clients-page">
      <button
        type="button"
        className="btn btn-outline clients-back"
        onClick={() => onBack(project.clientId)}
      >
        <ArrowLeft size={16} /> Retour à {getClientDisplayName(project.client)}
      </button>

      <div className="client-detail-header">
        <h1>{project.name}</h1>
        {!editing && (
          <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <div className="client-detail-form">
          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label>
            Date de début
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label>
            Date de fin
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>
          <div className="client-detail-form-actions">
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
              Enregistrer
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <dl className="client-detail-info">
          <div>
            <dt>Description</dt>
            <dd>{project.description || '—'}</dd>
          </div>
          <div>
            <dt>Début</dt>
            <dd>{project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}</dd>
          </div>
          <div>
            <dt>Fin</dt>
            <dd>{project.endDate ? new Date(project.endDate).toLocaleDateString() : '—'}</dd>
          </div>
        </dl>
      )}

      <div className="client-detail-projects">
        <div className="clients-header">
          <h2>Formules ({project.formulas.length})</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onCreateFormula(project.id)}
          >
            <Plus size={16} /> Créer une formule
          </button>
        </div>
        {project.formulas.length === 0 ? (
          <p className="clients-empty">Aucune formule associée à ce projet.</p>
        ) : (
          <table className="projects-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Statut</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {project.formulas.map((f) => (
                <tr key={f.id} onClick={() => onViewFormula(f.id, projectId)}>
                  <td>
                    <span className="projects-table-name">{f.name}</span>
                    {f.materializedAs && (
                      <span className="project-card-tag">
                        <Beaker size={11} /> Transformée en matière première
                      </span>
                    )}
                  </td>
                  <td>{f.status === 'completed' ? 'Finalisée' : 'Brouillon'}</td>
                  <td className="projects-table-date">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="project-card-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDuplicateFormula(f.id, projectId)
                      }}
                      aria-label="Dupliquer en nouvelle version"
                      title="Dupliquer en nouvelle version"
                    >
                      <Copy size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
