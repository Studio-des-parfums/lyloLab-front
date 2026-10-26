import { useState } from 'react'
import {
  Briefcase,
  Building2,
  Check,
  User,
  X,
} from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import { getClientDisplayName } from '../data/clientsApi'
import './ClientProjectPicker.css'

const NEW_CLIENT_VALUE = '__new_client__'

export default function ClientProjectPicker() {
  const {
    clients,
    clientsLoading,
    projectId,
    setProjectId,
    createClientAndSelect,
    createProjectAndSelect,
  } = useFormula()

  const [showClient, setShowClient] = useState(projectId !== null)
  const [chosenClientId, setChosenClientId] = useState('')
  const [creatingFor, setCreatingFor] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clientMode = showClient || projectId !== null
  const selectedClientId =
    chosenClientId ||
    (projectId
      ? (clients.find((c) => c.projects.some((p) => p.id === projectId))?.id ??
        '')
      : '')

  function selectPersonal() {
    setShowClient(false)
    setChosenClientId('')
    setCreatingFor(null)
    setDraftName('')
    setError(null)
    setProjectId(null)
  }

  function selectClient() {
    setShowClient(true)
    setError(null)
    if (clients.length === 0) {
      setCreatingFor('client')
      setDraftName('')
    }
  }

  function handleClientChange(value: string) {
    setError(null)
    if (value === NEW_CLIENT_VALUE) {
      setCreatingFor('client')
      setDraftName('')
      return
    }

    setChosenClientId(value)
    setProjectId(null)

    const client = clients.find((c) => c.id === value)
    if (!client || client.projects.length === 0) {
      setCreatingFor(`project:${value}`)
      setDraftName('')
    }
  }

  function handleProjectChange(value: string) {
    setError(null)
    if (value === NEW_CLIENT_VALUE) {
      setCreatingFor(`project:${selectedClientId}`)
      setDraftName('')
      return
    }
    setProjectId(value)
  }

  async function handleCreateClient() {
    if (!draftName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const client = await createClientAndSelect({ company: draftName.trim() })
      setChosenClientId(client.id)
      setShowClient(true)
      setCreatingFor(`project:${client.id}`)
      setDraftName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateProject(clientId: string) {
    if (!draftName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createProjectAndSelect({ name: draftName.trim() }, clientId)
      setCreatingFor(null)
      setDraftName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  function submitDraft() {
    if (!creatingFor) return
    if (creatingFor === 'client') {
      handleCreateClient()
      return
    }
    handleCreateProject(creatingFor.replace('project:', ''))
  }

  if (clientsLoading) return null

  return (
    <div className="client-picker">
      <span className="formula-settings-label">
        <Briefcase size={13} /> Type de formule
      </span>

      <div className="formula-type-toggle" role="group" aria-label="Type de formule">
        <button
          type="button"
          className={!clientMode ? 'active' : ''}
          onClick={selectPersonal}
        >
          <User size={14} /> Personnelle
        </button>
        <button
          type="button"
          className={clientMode ? 'active' : ''}
          onClick={selectClient}
        >
          <Building2 size={14} /> Client
        </button>
      </div>

      {clientMode && (
        <div className="client-picker-fields">
          {!creatingFor ? (
            <>
              <select
                className="formula-select"
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="" disabled>
                  Choisir un client
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getClientDisplayName(c)}
                  </option>
                ))}
                <option value={NEW_CLIENT_VALUE}>+ Nouveau client...</option>
              </select>

              {selectedClientId && (
                <select
                  className="formula-select"
                  value={projectId ?? ''}
                  onChange={(e) => handleProjectChange(e.target.value)}
                >
                  <option value="" disabled>
                    Choisir un projet
                  </option>
                  {clients
                    .find((c) => c.id === selectedClientId)
                    ?.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  <option value={NEW_CLIENT_VALUE}>+ Nouveau projet...</option>
                </select>
              )}
            </>
          ) : (
            <div className="client-picker-draft">
              <input
                type="text"
                autoFocus
                placeholder={
                  creatingFor === 'client' ? 'Société du client' : 'Nom du projet'
                }
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitDraft()
                }}
              />
              <button
                type="button"
                className="client-picker-confirm"
                disabled={busy || !draftName.trim()}
                onClick={submitDraft}
                aria-label="Valider"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                className="client-picker-cancel"
                onClick={() => {
                  setCreatingFor(null)
                  setDraftName('')
                  setError(null)
                }}
                aria-label="Annuler"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {error && <span className="client-picker-error">{error}</span>}
    </div>
  )
}
