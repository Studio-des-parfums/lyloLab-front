import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, ChevronDown, ChevronUp, FlaskConical, Hand, User } from 'lucide-react'
import {
  STATUS_LABEL,
  listFormulationRequests,
  takeFormulationRequest,
  type FormulationRequest,
} from '../data/formulationRequestsApi'
import './FormulationRequestsPage.css'

interface Props {
  onBack: () => void
  /** Ouvre la formule liée à la demande dans l'éditeur. */
  onOpenFormula: (formulaId: string, projectId: string | null) => void
  /** Prévient l'application que le nombre de demandes en attente a changé. */
  onChanged: () => void
}

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

function clientLabel(r: FormulationRequest): string | null {
  if (!r.forClient) return null
  const contact = [r.clientFirstName, r.clientLastName].filter(Boolean).join(' ')
  return [r.clientCompany, contact].filter(Boolean).join(' · ') || 'Client'
}

export default function FormulationRequestsPage({ onBack, onOpenFormula, onChanged }: Props) {
  const [requests, setRequests] = useState<FormulationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [takingId, setTakingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function load() {
    listFormulationRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleTake(r: FormulationRequest) {
    setTakingId(r.id)
    setError(null)
    try {
      const updated = await takeFormulationRequest(r.id)
      onChanged()
      setNotice(
        updated.projectId
          ? `« ${updated.perfumeName || 'Parfum'} » a été ajoutée au projet du client (page Clients).`
          : `« ${updated.perfumeName || 'Parfum'} » est dans vos « Formules à réaliser » (page Mes projets).`,
      )
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      load()
      onChanged()
    } finally {
      setTakingId(null)
    }
  }

  // Seules les demandes que personne n'a encore prises.
  const visible = requests.filter((r) => r.status === 'pending')

  return (
    <div className="requests-page">
      <button type="button" className="requests-back" onClick={onBack}>
        <ArrowLeft size={16} /> Mes projets
      </button>
      <div className="requests-header">
        <h1>Demandes de formulation</h1>
        <p>Demandes reçues des plateformes connectées, pas encore prises en charge.</p>
      </div>

      {notice && <p className="requests-notice">{notice}</p>}
      {error && <p className="requests-status requests-status-error">{error}</p>}
      {loading && <p className="requests-status">Chargement...</p>}
      {!loading && visible.length === 0 && (
        <p className="requests-status">Aucune demande en attente de prise en charge.</p>
      )}

      <ul className="requests-list">
        {visible.map((r) => {
          const open = openId === r.id
          const client = clientLabel(r)
          return (
            <li key={r.id} className="request-card">
              <div className="request-main">
                <div className="request-title">
                  <h3>{r.perfumeName || 'Parfum sans nom'}</h3>
                  <span className={`request-badge request-badge-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                </div>
                <div className="request-meta">
                  <span><User size={13} /> {r.requesterName} ({r.requesterEmail})</span>
                  {client && <span><Building2 size={13} /> {client}{r.projectName ? ` — ${r.projectName}` : ''}</span>}
                  <span>Reçue le {dateTime.format(new Date(r.createdAt))}{r.apiKey ? ` via ${r.apiKey.name}` : ''}</span>
                  {r.assignedTo && (
                    <span>Pris en charge par <strong>{r.assignedTo.name}</strong>{r.assignedAt ? ` le ${dateTime.format(new Date(r.assignedAt))}` : ''}</span>
                  )}
                  {r.completedAt && (
                    <span>Terminée le {dateTime.format(new Date(r.completedAt))}{r.completedBy ? ` par ${r.completedBy.name}` : ''}</span>
                  )}
                </div>
                <p className={`request-description${open ? ' open' : ''}`}>{r.description}</p>
                {r.description.length > 180 && (
                  <button type="button" className="request-more" onClick={() => setOpenId(open ? null : r.id)}>
                    {open ? <><ChevronUp size={14} /> Réduire</> : <><ChevronDown size={14} /> Lire tout</>}
                  </button>
                )}
              </div>
              <div className="request-actions">
                {r.status === 'pending' && (
                  <button type="button" className="btn btn-primary" disabled={takingId !== null} onClick={() => handleTake(r)}>
                    <Hand size={15} /> {takingId === r.id ? 'Prise en charge...' : "Je m'en occupe"}
                  </button>
                )}
                {r.formulaId && r.status !== 'pending' && (
                  <button type="button" className="btn btn-outline" onClick={() => onOpenFormula(r.formulaId!, r.projectId)}>
                    <FlaskConical size={15} /> Ouvrir la formule
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
