import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import {
  createRegulation,
  deleteRegulation,
  getRegulation,
  listRegulations,
  removeRegulationMaterial,
  updateRegulation,
  upsertRegulationMaterial,
  type RegulationDetail,
  type RegulationMaterial,
  type RegulationStatus,
  type RegulationSummary,
} from '../data/regulationsApi'
import './ProjectsPage.css'
import './ClientsPage.css'
import './RegulationsPage.css'

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Erreur inconnue')

const CONTINENTS = [
  'International',
  'Europe',
  'Amérique du Nord',
  'Amérique du Sud',
  'Asie',
  'Moyen-Orient',
  'Afrique',
  'Océanie',
]

const ALL = ''

/** Status shown in the Statut column. */
function statusInfo(r: { status: RegulationStatus; effectiveFrom: string | null }) {
  const pending = upcoming(r)
  if (r.status === 'proposal') return { label: 'Projet', tone: 'proposal' }
  if (pending) return { label: pending, tone: 'upcoming' }
  return { label: 'En vigueur', tone: 'in-force' }
}

/** Badge for a regulation that does not apply yet: "Projet", "À venir", "À partir du 31/07/2026". */
function upcoming(r: { status: RegulationStatus; effectiveFrom: string | null }): string | null {
  if (r.status === 'proposal') return 'Projet'
  const date = r.effectiveFrom ? new Date(r.effectiveFrom) : null
  if (date && date > new Date()) return `À partir du ${date.toLocaleDateString('fr-FR')}`
  return r.status === 'upcoming' ? 'À venir' : null
}

const zoneLabel = (r: { continent: string | null; country: string | null }) =>
  r.country && r.country !== r.continent ? `${r.country}` : r.continent || '—'

type InfoForm = {
  name: string
  description: string
  continent: string
  country: string
}
const EMPTY_INFO: InfoForm = {
  name: '',
  description: '',
  continent: '',
  country: '',
}

const trimInfo = (f: InfoForm) => ({
  name: f.name.trim(),
  description: f.description.trim(),
  continent: f.continent.trim(),
  country: f.country.trim(),
})

function InfoFields({
  form,
  onChange,
  countries,
  autoFocus,
}: {
  form: InfoForm
  onChange: (form: InfoForm) => void
  countries: string[]
  autoFocus?: boolean
}) {
  return (
    <>
      <label>
        Nom
        <input
          type="text"
          autoFocus={autoFocus}
          placeholder="ex: Cahier des charges client X, Politique sans muscs polycycliques"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </label>
      <div className="client-detail-form-row">
        <label>
          Continent / zone
          <select
            value={form.continent}
            onChange={(e) => onChange({ ...form, continent: e.target.value })}
          >
            <option value="">Non précisé</option>
            {CONTINENTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pays
          <input
            type="text"
            list="regulation-countries"
            placeholder="ex: France, Japon, Canada…"
            value={form.country}
            onChange={(e) => onChange({ ...form, country: e.target.value })}
          />
          <datalist id="regulation-countries">
            {countries.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>
    </>
  )
}

export default function RegulationsPage() {
  const [openId, setOpenId] = useState<string | null>(null)
  return openId ? (
    <RegulationView id={openId} onBack={() => setOpenId(null)} />
  ) : (
    <RegulationsList onOpen={setOpenId} />
  )
}

function RegulationsList({ onOpen }: { onOpen: (id: string) => void }) {
  const [regulations, setRegulations] = useState<RegulationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<InfoForm>(EMPTY_INFO)
  const [busy, setBusy] = useState(false)
  const [continent, setContinent] = useState(ALL)
  const [country, setCountry] = useState(ALL)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listRegulations()
      .then(setRegulations)
      .catch((err) => setError(errorText(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      const created = await createRegulation(trimInfo(form))
      onOpen(created.id)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  const continents = [...new Set(regulations.map((r) => r.continent).filter(Boolean))] as string[]
  continents.sort((a, b) => CONTINENTS.indexOf(a) - CONTINENTS.indexOf(b))
  const allCountries = [...new Set(regulations.map((r) => r.country).filter(Boolean))] as string[]
  const countries = allCountries
    .filter((c) =>
      regulations.some((r) => r.country === c && (!continent || r.continent === continent)),
    )
    .sort((a, b) => a.localeCompare(b))

  const q = query.trim().toLowerCase()
  const filtered = regulations.filter(
    (r) =>
      (!continent ||
        r.continent === continent ||
        // Worldwide standards apply everywhere.
        r.continent === 'International') &&
      (!country || r.country === country || r.continent === 'International') &&
      (!q || `${r.name} ${r.description ?? ''} ${r.country ?? ''}`.toLowerCase().includes(q)),
  )
  const official = filtered.filter((r) => !r.custom)
  const custom = filtered.filter((r) => r.custom)

  return (
    <div className="clients-page">
      <div className="clients-header">
        <div>
          <h1>Réglementation</h1>
          <p>
            Les réglementations qui s'appliquent à vos matières premières, et vos propres règles.
          </p>
        </div>
        {!creating && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Réglementation personnalisée
          </button>
        )}
      </div>

      {creating && (
        <div className="client-detail-form">
          <InfoFields form={form} onChange={setForm} countries={allCountries} autoFocus />
          <div className="client-detail-form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !form.name.trim()}
              onClick={handleCreate}
            >
              Créer
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setCreating(false)
                setForm(EMPTY_INFO)
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
          <div className="regulations-filters">
            <div className="regulations-chips" role="group" aria-label="Filtrer par zone">
              {[ALL, ...continents].map((c) => (
                <button
                  key={c || 'all'}
                  type="button"
                  className={`regulations-chip${continent === c ? ' active' : ''}`}
                  onClick={() => {
                    setContinent(c)
                    setCountry(ALL)
                  }}
                >
                  {c || 'Toutes les zones'}
                </button>
              ))}
            </div>
            <div className="regulations-actions">
              <select
                className="regulations-search"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Filtrer par pays"
              >
                <option value={ALL}>Tous les pays</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="search"
                className="regulations-search"
                placeholder="Rechercher…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {continent && continent !== 'International' && (
            <p className="regulations-filter-note">
              Les standards internationaux (IFRA…) s'appliquent dans toutes les zones et restent
              affichés.
            </p>
          )}
          <RegulationsTable title="Réglementations officielles" items={official} onOpen={onOpen} />
          <RegulationsTable
            title="Réglementations personnalisées"
            items={custom}
            onOpen={onOpen}
            empty={
              regulations.some((r) => r.custom)
                ? 'Aucune réglementation personnalisée pour ce filtre.'
                : 'Aucune réglementation personnalisée. Créez-en une pour un cahier des charges client ou une politique interne.'
            }
          />
        </>
      )}
    </div>
  )
}

function RegulationsTable({
  title,
  items,
  onOpen,
  empty,
}: {
  title: string
  items: RegulationSummary[]
  onOpen: (id: string) => void
  empty?: string
}) {
  return (
    <section className="regulations-section">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="clients-empty">{empty ?? 'Aucune réglementation.'}</p>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>Réglementation</th>
              <th>Zone</th>
              <th>Statut</th>
              <th>Description</th>
              <th className="regulations-count">Matières concernées</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr
                key={r.id}
                tabIndex={0}
                onClick={() => onOpen(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(r.id)
                }}
              >
                <td>
                  <span className="projects-table-name">{r.name}</span>
                </td>
                <td className="regulations-zone">
                  {zoneLabel(r)}
                  {r.continent && r.country && r.country !== r.continent && (
                    <span>{r.continent}</span>
                  )}
                </td>
                <td>
                  <span className={`regulations-status regulations-status-${statusInfo(r).tone}`}>
                    {statusInfo(r).label}
                  </span>
                </td>
                <td className="regulations-description">{r.description || '—'}</td>
                <td className="regulations-count">{r.materialCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

const EMPTY_ENTRY = { materialId: '', maxPercent: '', banned: false, note: '' }

function RegulationView({ id, onBack }: { id: string; onBack: () => void }) {
  const { catalog } = useFormula()
  const [regulation, setRegulation] = useState<RegulationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingInfo, setEditingInfo] = useState(false)
  const [info, setInfo] = useState<InfoForm>(EMPTY_INFO)
  const [entry, setEntry] = useState(EMPTY_ENTRY)
  const [entryOpen, setEntryOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    getRegulation(id)
      .then(setRegulation)
      .catch((err) => setError(errorText(err)))
  }, [id])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items = regulation?.materials ?? []
    return q
      ? items.filter((m) =>
          [m.material, m.status, m.detail ?? '', m.note ?? ''].some((v) =>
            v.toLowerCase().includes(q),
          ),
        )
      : items
  }, [regulation, query])

  async function run(action: () => Promise<RegulationDetail | void>) {
    setBusy(true)
    setError(null)
    try {
      const updated = await action()
      if (updated) setRegulation(updated)
      return true
    } catch (err) {
      setError(errorText(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  function editEntry(m: RegulationMaterial) {
    setEntry({
      materialId: m.materialId,
      maxPercent: m.maxPercent ? String(m.maxPercent) : '',
      banned: m.maxPercent === 0,
      note: m.note ?? '',
    })
    setEntryOpen(true)
  }

  async function saveEntry() {
    const maxPercent = entry.banned ? null : parseFloat(entry.maxPercent.replace(',', '.'))
    if (!entry.materialId || (maxPercent !== null && !(maxPercent > 0 && maxPercent <= 100))) return
    const ok = await run(() =>
      upsertRegulationMaterial(id, {
        materialId: entry.materialId,
        maxPercent,
        note: entry.note.trim() || undefined,
      }),
    )
    if (ok) {
      setEntry(EMPTY_ENTRY)
      setEntryOpen(false)
    }
  }

  if (!regulation) {
    return (
      <div className="clients-page">
        <p className={`clients-status${error ? ' clients-status-error' : ''}`}>
          {error ?? 'Chargement...'}
        </p>
      </div>
    )
  }

  const entryValid =
    !!entry.materialId &&
    (entry.banned ||
      (parseFloat(entry.maxPercent.replace(',', '.')) > 0 &&
        parseFloat(entry.maxPercent.replace(',', '.')) <= 100))
  const alreadyListed = new Set(regulation.materials.map((m) => m.materialId))

  return (
    <div className="clients-page">
      <button type="button" className="btn btn-outline clients-back" onClick={onBack}>
        <ArrowLeft size={16} /> Retour aux réglementations
      </button>

      {editingInfo ? (
        <div className="client-detail-form">
          <InfoFields form={info} onChange={setInfo} countries={[]} />
          <div className="client-detail-form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !info.name.trim()}
              onClick={async () => {
                if (await run(() => updateRegulation(id, trimInfo(info)))) setEditingInfo(false)
              }}
            >
              Enregistrer
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setEditingInfo(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="client-detail-header">
          <div>
            <h1>{regulation.name}</h1>
            <p className="regulations-subtitle">
              {regulation.custom ? 'Réglementation personnalisée' : 'Réglementation officielle'}
              {regulation.continent || regulation.country
                ? ` · ${[
                    regulation.continent,
                    regulation.country !== regulation.continent ? regulation.country : null,
                  ]
                    .filter(Boolean)
                    .join(' — ')}`
                : ''}
            </p>
            {regulation.description && (
              <p className="regulations-subtitle">{regulation.description}</p>
            )}
            {upcoming(regulation) && (
              <span className="regulations-upcoming">
                Pas encore en vigueur · {upcoming(regulation)}
              </span>
            )}
          </div>
          {regulation.custom && (
            <div className="regulations-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setInfo({
                    name: regulation.name,
                    description: regulation.description ?? '',
                    continent: regulation.continent ?? '',
                    country: regulation.country ?? '',
                  })
                  setEditingInfo(true)
                }}
              >
                Modifier
              </button>
              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary regulations-danger"
                    disabled={busy}
                    onClick={async () => {
                      if (await run(() => deleteRegulation(id))) onBack()
                    }}
                  >
                    Confirmer la suppression
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!regulation.custom && (
        <p className="regulations-hint">
          Calculée à partir des données réglementaires de vos matières premières. Pour corriger un
          statut, modifiez la fiche de la matière.
        </p>
      )}

      {error && <p className="clients-status clients-status-error">{error}</p>}

      <div className="clients-header regulations-toolbar">
        <h2>Matières concernées ({regulation.materials.length})</h2>
        <div className="regulations-actions">
          {regulation.materials.length > 8 && (
            <input
              type="search"
              className="regulations-search"
              placeholder="Rechercher…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          {regulation.custom && !entryOpen && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEntry(EMPTY_ENTRY)
                setEntryOpen(true)
              }}
            >
              <Plus size={16} /> Ajouter une matière
            </button>
          )}
        </div>
      </div>

      {entryOpen && (
        <div className="client-detail-form">
          <label>
            Matière première
            <select
              value={entry.materialId}
              onChange={(e) => setEntry((f) => ({ ...f, materialId: e.target.value }))}
            >
              <option value="">Choisir une matière…</option>
              {catalog
                .filter((m) => m.id === entry.materialId || !alreadyListed.has(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="client-detail-form-row">
            <label>
              Concentration maximale (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                disabled={entry.banned}
                value={entry.maxPercent}
                onChange={(e) => setEntry((f) => ({ ...f, maxPercent: e.target.value }))}
              />
            </label>
            <label className="regulations-checkbox">
              <input
                type="checkbox"
                checked={entry.banned}
                onChange={(e) => setEntry((f) => ({ ...f, banned: e.target.checked }))}
              />
              Interdite
            </label>
          </div>
          <label>
            Note
            <input
              type="text"
              placeholder="ex: demandé par le client, source, date…"
              value={entry.note}
              onChange={(e) => setEntry((f) => ({ ...f, note: e.target.value }))}
            />
          </label>
          <div className="client-detail-form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !entryValid}
              onClick={saveEntry}
            >
              Enregistrer
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setEntryOpen(false)
                setEntry(EMPTY_ENTRY)
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {regulation.materials.length === 0 ? (
        <p className="clients-empty">
          {regulation.custom
            ? 'Aucune matière pour le moment. Ajoutez les matières limitées ou interdites par cette règle.'
            : "Aucune matière de votre catalogue n'est concernée."}
        </p>
      ) : (
        <table className="projects-table regulations-materials">
          <thead>
            <tr>
              <th>Matière première</th>
              <th>{regulation.custom ? 'Limite' : 'Statut'}</th>
              <th>{regulation.custom ? 'Note' : 'Détail'}</th>
              {regulation.custom && <th />}
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr key={m.materialId} className="regulations-row">
                <td>
                  <span className="projects-table-name">{m.material}</span>
                </td>
                <td>
                  <span className={m.maxPercent === 0 ? 'regulations-banned' : undefined}>
                    {m.status}
                  </span>
                </td>
                <td className="regulations-description">{m.note ?? m.detail ?? '—'}</td>
                {regulation.custom && (
                  <td className="regulations-row-actions">
                    <button
                      type="button"
                      className="project-card-delete"
                      onClick={() => editEntry(m)}
                      aria-label={`Modifier ${m.material}`}
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="project-card-delete"
                      disabled={busy}
                      onClick={() => run(() => removeRegulationMaterial(id, m.materialId))}
                      aria-label={`Retirer ${m.material}`}
                      title="Retirer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {regulation.substances.length > 0 && (
        <section className="regulations-sources">
          <h2>Substances listées ({regulation.substances.length})</h2>
          <ul className="regulations-substances">
            {regulation.substances.map((substance) => (
              <li key={substance.name}>
                {substance.name}
                {substance.casNumber && (
                  <span className="regulations-source-meta">CAS {substance.casNumber}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {regulation.sources.length > 0 && (
        <section className="regulations-sources">
          <h2>Textes et sources officiels</h2>
          <ul>
            {regulation.sources.map((source) => (
              <li key={source.ref}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <span className="regulations-source-meta">
                  {source.organisation} · {source.date}
                </span>
                {source.usage && <span className="regulations-description">{source.usage}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
