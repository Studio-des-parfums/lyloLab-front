import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Check, CircleCheck, CopyPlus, ExternalLink, Pencil, StickyNote } from 'lucide-react'
import VersionGraph from '../components/VersionGraph'
import FormulaNotesModal from '../components/FormulaNotesModal'
import { fetchLineage, parentCode, type FormulaLineageDetail, type LineageVersion } from '../data/lineageApi'
import { formulaAuthor, versionLabel } from '../data/formulasApi'
import {
  markFinalVersion,
  unmarkFinalVersion,
  updateFormulaDescription,
  updateFormulaSchedule,
} from '../data/formulaCollabApi'
import '../components/FormulaLineageTable.css'
import './FormulaLineagePage.css'

interface Props {
  formulaId: string
  backLabel: string
  onBack: () => void
  onOpenVersion: (id: string, projectId: string | null) => void
  onNewVersionFrom: (id: string, projectId: string | null) => void
}

const STATUS_LABEL = { draft: 'Brouillon', completed: 'Finalisée' } as const
const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Page d'une formule : résultat visé, arbre des versions et liste des versions. */
export default function FormulaLineagePage({ formulaId, backLabel, onBack, onOpenVersion, onNewVersionFrom }: Props) {
  const [lineage, setLineage] = useState<FormulaLineageDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [notesOf, setNotesOf] = useState<LineageVersion | null>(null)
  const [confirmFinalId, setConfirmFinalId] = useState<string | null>(null)
  const [editingDates, setEditingDates] = useState(false)
  const [dates, setDates] = useState({ startDate: '', endDate: '' })

  const load = useCallback(
    () =>
      fetchLineage(formulaId)
        .then(setLineage)
        .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue')),
    [formulaId],
  )

  useEffect(() => {
    load()
  }, [load])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  function select(id: string) {
    setSelectedId(id)
    document.getElementById(`version-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (!lineage) {
    return (
      <div className="lineage-page">
        <button type="button" className="lineage-page-back" onClick={onBack}>
          <ArrowLeft size={16} /> {backLabel}
        </button>
        <p className={error ? 'lineage-page-status error' : 'lineage-page-status'}>{error ?? 'Chargement...'}</p>
      </div>
    )
  }

  const projectId = lineage.project?.id ?? null
  const final = lineage.versions.find((v) => v.id === lineage.finalVersionId)
  const byCode = new Map(lineage.versions.filter((v) => v.code).map((v) => [v.code!, v]))
  // Liste : de la plus récente à la plus ancienne.
  const versions = [...lineage.versions].sort((a, b) => b.version - a.version)
  const prefix = lineage.versions.find((v) => v.code)?.code?.split('-').slice(0, 2).join('-')
  const client = lineage.project?.client
  const clientName = client
    ? client.company || [client.contactFirstName, client.contactLastName].filter(Boolean).join(' ')
    : null

  return (
    <div className="lineage-page">
      <button type="button" className="lineage-page-back" onClick={onBack}>
        <ArrowLeft size={16} /> {backLabel}
      </button>

      <header className="lineage-page-header">
        <h1>{lineage.name}</h1>
        <p>
          {prefix && <code className="lineage-page-prefix">{prefix}</code>}
          {lineage.versions.length} version{lineage.versions.length > 1 ? 's' : ''}
          {lineage.project && <> · {clientName ? `${clientName} — ` : ''}{lineage.project.name}</>}
          {final && (
            <span className="lineage-final">
              <CircleCheck size={12} /> Finale : {versionLabel(final)}
            </span>
          )}
        </p>
      </header>

      {error && <p className="lineage-page-status error">{error}</p>}

      <section className="lineage-page-card lineage-goal">
        <div className="lineage-goal-head">
          <span>Résultat visé</span>
          {!editingGoal && (
            <button
              type="button"
              className="lineage-goal-edit"
              onClick={() => {
                setGoalDraft(lineage.description ?? '')
                setEditingGoal(true)
              }}
            >
              <Pencil size={13} /> {lineage.description ? 'Modifier' : 'Définir'}
            </button>
          )}
        </div>
        {editingGoal ? (
          <>
            <textarea
              autoFocus
              rows={4}
              maxLength={5000}
              placeholder="À quoi doit ressembler la version finale : intention olfactive, ambiance, contraintes..."
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
            />
            <div className="lineage-goal-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await updateFormulaDescription(lineage.rootId, goalDraft.trim() || null)
                    setEditingGoal(false)
                  })
                }
              >
                <Check size={14} /> Enregistrer
              </button>
              <button type="button" className="lineage-close-inline" onClick={() => setEditingGoal(false)}>
                Annuler
              </button>
            </div>
          </>
        ) : (
          <p className={lineage.description ? '' : 'lineage-goal-empty'}>
            {lineage.description || 'Pas encore défini : décrivez à quoi doit ressembler la version finale.'}
          </p>
        )}
      </section>

      <section className="lineage-page-card lineage-dates">
        <CalendarDays size={16} className="lineage-dates-icon" />
        {editingDates ? (
          <>
            <label>
              Début
              <input type="date" value={dates.startDate} onChange={(e) => setDates((d) => ({ ...d, startDate: e.target.value }))} />
            </label>
            <label>
              Fin
              <input type="date" value={dates.endDate} onChange={(e) => setDates((d) => ({ ...d, endDate: e.target.value }))} />
            </label>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await updateFormulaSchedule(lineage.rootId, {
                    startDate: dates.startDate || null,
                    endDate: dates.endDate || null,
                  })
                  setEditingDates(false)
                })
              }
            >
              <Check size={14} /> Enregistrer
            </button>
            <button type="button" className="lineage-close-inline" onClick={() => setEditingDates(false)}>
              Annuler
            </button>
          </>
        ) : (
          <>
            <span>
              <strong>Début :</strong> {lineage.startDate ? dateFormat.format(new Date(lineage.startDate)) : '—'}
            </span>
            <span>
              <strong>Fin :</strong> {lineage.endDate ? dateFormat.format(new Date(lineage.endDate)) : '—'}
            </span>
            <button
              type="button"
              className="lineage-goal-edit"
              onClick={() => {
                setDates({
                  startDate: lineage.startDate?.slice(0, 10) ?? '',
                  endDate: lineage.endDate?.slice(0, 10) ?? '',
                })
                setEditingDates(true)
              }}
            >
              <Pencil size={13} /> Modifier les dates
            </button>
          </>
        )}
      </section>

      <section className="lineage-page-section">
        <h2>Arbre des versions</h2>
        <VersionGraph
          versions={lineage.versions}
          finalVersionId={lineage.finalVersionId}
          selectedId={selectedId}
          onSelect={select}
        />
      </section>

      <section className="lineage-page-section">
        <h2>Toutes les versions</h2>
        <ul className="lineage-page-versions">
          {versions.map((v) => {
            const isFinal = v.id === lineage.finalVersionId
            const parent = v.code ? byCode.get(parentCode(v.code) ?? '') : undefined
            return (
              <li
                key={v.id}
                id={`version-${v.id}`}
                className={`lineage-page-version${isFinal ? ' final' : ''}${selectedId === v.id ? ' selected' : ''}`}
                onClick={() => setSelectedId(v.id)}
              >
                <div className="lpv-main">
                  <span className="lineage-badge">{versionLabel(v)}</span>
                  <span className={`lineage-status lineage-status-${v.status}`}>{STATUS_LABEL[v.status]}</span>
                  {isFinal && (
                    <span className="lineage-final">
                      <CircleCheck size={11} /> Version finale
                    </span>
                  )}
                  <span className="lpv-meta">
                    {formulaAuthor(v) ?? '—'} · {dateFormat.format(new Date(v.createdAt))}
                    {parent && <> · issue de {versionLabel(parent)}</>}
                    {' · '}
                    {v._count.lines} matière{v._count.lines > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="lpv-actions">
                  <button type="button" className="lineage-final-btn" onClick={() => setNotesOf(v)}>
                    <StickyNote size={13} /> Notes ({v._count.notes})
                  </button>
                  <button type="button" className="lineage-final-btn" onClick={() => onOpenVersion(v.id, projectId)}>
                    <ExternalLink size={13} /> Ouvrir
                  </button>
                  <button type="button" className="lineage-final-btn" onClick={() => onNewVersionFrom(v.id, projectId)}>
                    <CopyPlus size={13} /> Repartir de cette version
                  </button>
                  {isFinal ? (
                    <button
                      type="button"
                      className="lineage-final-btn"
                      disabled={busy}
                      onClick={() => run(() => unmarkFinalVersion(v.id))}
                    >
                      Retirer « finale »
                    </button>
                  ) : confirmFinalId === v.id ? (
                    <>
                      <span className="lineage-final-hint">
                        {v.status === 'draft' ? 'Elle sera aussi finalisée (verrouillée).' : 'Confirmer ?'}
                      </span>
                      <button
                        type="button"
                        className="lineage-final-btn primary"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await markFinalVersion(v.id)
                            setConfirmFinalId(null)
                          })
                        }
                      >
                        Confirmer
                      </button>
                      <button type="button" className="lineage-final-btn" onClick={() => setConfirmFinalId(null)}>
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button type="button" className="lineage-final-btn" onClick={() => setConfirmFinalId(v.id)}>
                      <CircleCheck size={13} /> Version finale
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {notesOf && (
        <FormulaNotesModal
          versions={[notesOf]}
          onClose={() => {
            setNotesOf(null)
            load()
          }}
        />
      )}
    </div>
  )
}
