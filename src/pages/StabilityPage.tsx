import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Camera, Check, FlaskConical, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { listFormulas, type FormulaSummary } from '../data/formulasApi'
import {
  APPEARANCE_LABEL,
  CONCLUSION_LABEL,
  GRADE_LABEL,
  STATUS_LABEL,
  addObservation,
  createStabilityCampaign,
  deleteObservation,
  deletePhoto,
  deleteStabilityTest,
  fetchPhotoUrl,
  formatDate,
  getFormulaRisks,
  getMaterialsStability,
  getStabilityCatalog,
  getStabilityOverview,
  getStabilityTest,
  listStabilityTests,
  updateStabilityTest,
  uploadPhoto,
  type Appearance,
  type Conclusion,
  type FormulaRiskReport,
  type Grade,
  type MaterialStability,
  type RiskType,
  type StabilityCatalog,
  type StabilityOverview,
  type StabilityTest,
  type StabilityTestDetail,
  type TestStatus,
} from '../data/stabilityApi'
import StabilityRiskPanel, {
  RISK_LABEL,
  RiskChips,
  TriggerChips,
} from '../components/StabilityRiskPanel'
import './ProjectsPage.css'
import './ClientsPage.css'
import './RegulationsPage.css'
import './StabilityPage.css'

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Erreur inconnue')
const todayIso = () => new Date().toISOString().slice(0, 10)

type Tab = 'due' | 'tests' | 'materials'
type View = { name: 'home'; tab: Tab } | { name: 'test'; id: string } | { name: 'new'; formulaId?: string }

function useCatalog() {
  const [catalog, setCatalog] = useState<StabilityCatalog | null>(null)
  useEffect(() => {
    getStabilityCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null))
  }, [])
  return catalog
}

function conditionName(
  catalog: StabilityCatalog | null,
  test: { condition: string; conditionLabel: string | null },
) {
  const base = catalog?.conditions.find((c) => c.code === test.condition)?.label ?? test.condition
  return test.condition === 'other' && test.conditionLabel
    ? test.conditionLabel
    : test.conditionLabel
      ? `${base} — ${test.conditionLabel}`
      : base
}

const baseName = (catalog: StabilityCatalog | null, code: string) =>
  catalog?.bases.find((b) => b.code === code)?.label ?? code

function GradeBadge({ grade }: { grade: Grade | null }) {
  if (!grade) return <span className="stability-muted">—</span>
  return <span className={`stability-grade stability-grade-${grade}`}>{GRADE_LABEL[grade]}</span>
}

export default function StabilityPage() {
  const [view, setView] = useState<View>({ name: 'home', tab: 'due' })
  const catalog = useCatalog()

  if (view.name === 'test') {
    return (
      <TestView
        id={view.id}
        catalog={catalog}
        onBack={() => setView({ name: 'home', tab: 'tests' })}
        onOpen={(id) => setView({ name: 'test', id })}
      />
    )
  }
  if (view.name === 'new') {
    return (
      <NewCampaign
        catalog={catalog}
        initialFormulaId={view.formulaId}
        onCancel={() => setView({ name: 'home', tab: 'tests' })}
        onCreated={() => setView({ name: 'home', tab: 'tests' })}
      />
    )
  }
  return (
    <Home
      tab={view.tab}
      catalog={catalog}
      onTab={(tab) => setView({ name: 'home', tab })}
      onOpenTest={(id) => setView({ name: 'test', id })}
      onNew={() => setView({ name: 'new' })}
    />
  )
}

// ── Home ────────────────────────────────────────────────────────────────

function Home({
  tab,
  catalog,
  onTab,
  onOpenTest,
  onNew,
}: {
  tab: Tab
  catalog: StabilityCatalog | null
  onTab: (tab: Tab) => void
  onOpenTest: (id: string) => void
  onNew: () => void
}) {
  const [overview, setOverview] = useState<StabilityOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getStabilityOverview()
      .then(setOverview)
      .catch((err) => setError(errorText(err)))
  }, [])

  const toCheck = overview?.due.filter((d) => d.state !== 'upcoming').length ?? 0

  return (
    <div className="clients-page stability-page">
      <div className="clients-header">
        <div>
          <h1>Tests & stabilité</h1>
          <p>
            Suivi des tests de vieillissement de vos formules, et risques de stabilité connus de vos
            matières premières.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <Plus size={16} /> Lancer des tests
        </button>
      </div>

      {error && <p className="clients-status clients-status-error">{error}</p>}

      <div className="stability-kpis">
        <button type="button" className="stability-kpi" onClick={() => onTab('due')}>
          <strong className={toCheck > 0 ? 'stability-kpi-alert' : undefined}>{toCheck}</strong>
          <span>Contrôles à faire</span>
        </button>
        <button type="button" className="stability-kpi" onClick={() => onTab('tests')}>
          <strong>{overview?.counts.in_progress ?? 0}</strong>
          <span>Tests en cours</span>
        </button>
        <button type="button" className="stability-kpi" onClick={() => onTab('tests')}>
          <strong>{overview?.counts.completed ?? 0}</strong>
          <span>Tests terminés</span>
        </button>
        <button type="button" className="stability-kpi" onClick={() => onTab('tests')}>
          <strong className={overview?.nonConform ? 'stability-kpi-alert' : undefined}>
            {overview?.nonConform ?? 0}
          </strong>
          <span>Non conformes</span>
        </button>
      </div>

      <div className="stability-tabs" role="tablist">
        {(
          [
            ['due', 'À contrôler'],
            ['tests', 'Tests'],
            ['materials', 'Matières à risque'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`stability-tab${tab === key ? ' active' : ''}`}
            onClick={() => onTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'due' && <DueTab overview={overview} catalog={catalog} onOpenTest={onOpenTest} />}
      {tab === 'tests' && <TestsTab catalog={catalog} onOpenTest={onOpenTest} />}
      {tab === 'materials' && <MaterialsTab />}
    </div>
  )
}

function DueTab({
  overview,
  catalog,
  onOpenTest,
}: {
  overview: StabilityOverview | null
  catalog: StabilityCatalog | null
  onOpenTest: (id: string) => void
}) {
  if (!overview) return <p className="clients-status">Chargement...</p>
  if (overview.due.length === 0) {
    return (
      <p className="clients-empty">
        Aucun contrôle prévu dans les 7 prochains jours. Lancez des tests depuis « Lancer des tests ».
      </p>
    )
  }
  const stateLabel = { overdue: 'En retard', today: "Aujourd'hui", upcoming: 'À venir' }
  return (
    <table className="projects-table stability-table">
      <thead>
        <tr>
          <th>Échéance</th>
          <th>Formule</th>
          <th>Condition</th>
          <th>Base</th>
          <th>Contrôle</th>
        </tr>
      </thead>
      <tbody>
        {overview.due.map((d) => (
          <tr
            key={`${d.testId}-${d.day}`}
            tabIndex={0}
            onClick={() => onOpenTest(d.testId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOpenTest(d.testId)
            }}
          >
            <td className="stability-num">
              {formatDate(d.dueDate)}
              <span className={`stability-due stability-due-${d.state}`}>{stateLabel[d.state]}</span>
            </td>
            <td>
              <span className="projects-table-name">{d.formula.name}</span>
            </td>
            <td>{conditionName(catalog, d)}</td>
            <td className="stability-muted">{baseName(catalog, d.base)}</td>
            <td className="stability-num">J+{d.day}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TestsTab({
  catalog,
  onOpenTest,
}: {
  catalog: StabilityCatalog | null
  onOpenTest: (id: string) => void
}) {
  const [tests, setTests] = useState<StabilityTest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<TestStatus | ''>('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    setTests(null)
    listStabilityTests(status ? { status } : {})
      .then(setTests)
      .catch((err) => setError(errorText(err)))
  }, [status])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (tests ?? []).filter(
      (t) => !q || `${t.formula.name} ${conditionName(catalog, t)}`.toLowerCase().includes(q),
    )
  }, [tests, query, catalog])

  return (
    <>
      <div className="stability-filters">
        <div className="stability-chips">
          {(['', 'in_progress', 'completed', 'cancelled'] as const).map((s) => (
            <button
              key={s || 'all'}
              type="button"
              className={`regulations-chip${status === s ? ' active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s ? STATUS_LABEL[s] : 'Tous'}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="stability-input"
          placeholder="Rechercher une formule…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <p className="clients-status clients-status-error">{error}</p>}
      {!tests ? (
        <p className="clients-status">Chargement...</p>
      ) : visible.length === 0 ? (
        <p className="clients-empty">Aucun test.</p>
      ) : (
        <table className="projects-table stability-table">
          <thead>
            <tr>
              <th>Formule</th>
              <th>Condition</th>
              <th>Base</th>
              <th>Début</th>
              <th>Avancement</th>
              <th>Prochain contrôle</th>
              <th>Résultat</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr
                key={t.id}
                tabIndex={0}
                onClick={() => onOpenTest(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpenTest(t.id)
                }}
              >
                <td>
                  <span className="projects-table-name">{t.formula.name}</span>
                </td>
                <td>{conditionName(catalog, t)}</td>
                <td className="stability-muted">{baseName(catalog, t.base)}</td>
                <td className="stability-num">{formatDate(t.startDate)}</td>
                <td className="stability-num">
                  <span className="stability-progress">
                    <span style={{ width: `${Math.round(t.progress * 100)}%` }} />
                  </span>
                  {t.checkpointList.filter((c) => c.done).length}/{t.checkpointList.length}
                </td>
                <td className="stability-num">
                  {t.nextCheckpoint ? (
                    <>
                      {formatDate(t.nextCheckpoint.dueDate)}
                      {t.overdueCount > 0 && (
                        <span className="stability-due stability-due-overdue">En retard</span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {t.conclusion ? (
                    <span className={`stability-conclusion stability-conclusion-${t.conclusion}`}>
                      {CONCLUSION_LABEL[t.conclusion]}
                    </span>
                  ) : (
                    <GradeBadge grade={t.worstGrade} />
                  )}
                </td>
                <td>
                  <span className={`stability-status stability-status-${t.status}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function MaterialsTab() {
  const [materials, setMaterials] = useState<MaterialStability[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [risk, setRisk] = useState<RiskType | 'stable' | ''>('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    getMaterialsStability()
      .then(setMaterials)
      .catch((err) => setError(errorText(err)))
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (materials ?? []).filter(
      (m) =>
        (!risk || (risk === 'stable' ? m.stable : m.risks.includes(risk))) &&
        (!q ||
          `${m.material} ${m.issue ?? ''} ${m.triggers ?? ''} ${m.impact ?? ''}`
            .toLowerCase()
            .includes(q)),
    )
  }, [materials, risk, query])

  return (
    <>
      <div className="stability-filters">
        <div className="stability-chips">
          {(['', ...Object.keys(RISK_LABEL), 'stable'] as (RiskType | 'stable' | '')[]).map((r) => (
            <button
              key={r || 'all'}
              type="button"
              className={`regulations-chip${risk === r ? ' active' : ''}`}
              onClick={() => setRisk(r)}
            >
              {r === '' ? 'Toutes' : r === 'stable' ? 'Stables' : RISK_LABEL[r]}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="stability-input"
          placeholder="Rechercher une matière…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="stability-source">
        Données connues : fichier RADAR (problème physico-chimique, conditions déclenchantes,
        impact, compatibilité) et indices de peroxyde maximaux du règlement (UE) 2023/1545.
      </p>
      {error && <p className="clients-status clients-status-error">{error}</p>}
      {!materials ? (
        <p className="clients-status">Chargement...</p>
      ) : visible.length === 0 ? (
        <p className="clients-empty">Aucune matière pour ce filtre.</p>
      ) : (
        <table className="projects-table stability-table">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Risques</th>
              <th>Problème</th>
              <th>Conditions déclenchantes</th>
              <th>Impact</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr key={m.materialId} className="stability-row-static">
                <td>
                  <span className="projects-table-name">{m.material}</span>
                  {m.specs.map((spec) => (
                    <span key={spec.parameter} className="stability-spec">
                      Indice de peroxyde &lt; {spec.maxValue} {spec.unit}
                    </span>
                  ))}
                </td>
                <td>
                  {m.stable ? (
                    <span className="stability-grade stability-grade-conform">Stable</span>
                  ) : (
                    <RiskChips risks={m.risks} />
                  )}
                </td>
                <td className="stability-muted">{m.issue ?? '—'}</td>
                <td>
                  <TriggerChips factors={m.triggerFactors} raw={m.triggers} />
                </td>
                <td className="stability-muted">{m.impact ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

// ── New campaign ────────────────────────────────────────────────────────

const parseDays = (text: string) =>
  [...new Set(text.split(/[\s,;]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 0))].sort(
    (a, b) => a - b,
  )

function NewCampaign({
  catalog,
  initialFormulaId,
  onCancel,
  onCreated,
}: {
  catalog: StabilityCatalog | null
  initialFormulaId?: string
  onCancel: () => void
  onCreated: () => void
}) {
  const [formulas, setFormulas] = useState<FormulaSummary[]>([])
  const [formulaId, setFormulaId] = useState(initialFormulaId ?? '')
  const [report, setReport] = useState<FormulaRiskReport | null>(null)
  const [selected, setSelected] = useState<Record<string, { days: string; label: string }>>({})
  const [base, setBase] = useState('alcohol')
  const [container, setContainer] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listFormulas()
      .then(setFormulas)
      .catch((err) => setError(errorText(err)))
  }, [])

  // Analyse the formula and pre-select the recommended tests.
  useEffect(() => {
    setReport(null)
    if (!formulaId || !catalog) return
    getFormulaRisks(formulaId)
      .then((r) => {
        setReport(r)
        setSelected(
          Object.fromEntries(
            r.recommended.map((rec) => {
              const info = catalog.conditions.find((c) => c.code === rec.condition)
              return [rec.condition, { days: (info?.checkpoints ?? []).join(', '), label: '' }]
            }),
          ),
        )
      })
      .catch((err) => setError(errorText(err)))
  }, [formulaId, catalog])

  function toggle(code: string, checked: boolean) {
    const info = catalog?.conditions.find((c) => c.code === code)
    setSelected((prev) => {
      const next = { ...prev }
      if (checked) next[code] = { days: (info?.checkpoints ?? []).join(', '), label: '' }
      else delete next[code]
      return next
    })
  }

  const conditions = Object.entries(selected).map(([condition, v]) => ({
    condition,
    conditionLabel: v.label.trim() || undefined,
    checkpoints: parseDays(v.days),
  }))
  const valid =
    !!formulaId &&
    conditions.length > 0 &&
    conditions.every((c) => c.checkpoints.length > 0) &&
    (!selected.other || !!selected.other.label.trim())

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await createStabilityCampaign({
        formulaId,
        base,
        container: container.trim() || undefined,
        startDate,
        notes: notes.trim() || undefined,
        conditions,
      })
      onCreated()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  const recommended = new Set(report?.recommended.map((r) => r.condition) ?? [])

  return (
    <div className="clients-page stability-page">
      <button type="button" className="btn btn-outline clients-back" onClick={onCancel}>
        <ArrowLeft size={16} /> Retour
      </button>
      <div className="clients-header">
        <div>
          <h1>Lancer des tests de stabilité</h1>
          <p>Un test par condition, tous démarrés le même jour sur la même formule.</p>
        </div>
      </div>

      <div className="client-detail-form">
        <label>
          Formule
          <select value={formulaId} onChange={(e) => setFormulaId(e.target.value)}>
            <option value="">Choisir une formule…</option>
            {formulas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.status === 'completed' ? ' (finalisée)' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="client-detail-form-row">
          <label>
            Base testée
            <select value={base} onChange={(e) => setBase(e.target.value)}>
              {catalog?.bases.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date de début
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        </div>
        <label>
          Contenant
          <input
            type="text"
            placeholder="ex: flacon verre transparent 30 ml, pompe"
            value={container}
            onChange={(e) => setContainer(e.target.value)}
          />
        </label>
      </div>

      {formulaId && !report && <p className="clients-status">Analyse de la formule…</p>}
      {report && (
        <section className="stability-card">
          <h2>Risques connus de la formule</h2>
          <StabilityRiskPanel report={report} catalog={catalog} />
        </section>
      )}

      {catalog && (
        <section className="stability-card">
          <h2>Conditions de test</h2>
          <p className="stability-muted">
            Les tests conseillés sont pré-cochés. Les jours de contrôle sont modifiables (ex : 7, 14,
            28, 56, 84).
          </p>
          <div className="stability-conditions">
            {catalog.conditions.map((c) => {
              const value = selected[c.code]
              return (
                <div key={c.code} className={`stability-condition${value ? ' selected' : ''}`}>
                  <label className="stability-condition-head">
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) => toggle(c.code, e.target.checked)}
                    />
                    <strong>{c.label}</strong>
                    {recommended.has(c.code) && <span className="stability-reco">Conseillé</span>}
                  </label>
                  <span className="stability-muted">{c.description}</span>
                  {value && (
                    <div className="stability-condition-fields">
                      {c.code === 'other' && (
                        <input
                          type="text"
                          className="stability-input"
                          placeholder="Décrire la condition"
                          value={value.label}
                          onChange={(e) =>
                            setSelected((p) => ({ ...p, [c.code]: { ...value, label: e.target.value } }))
                          }
                        />
                      )}
                      <input
                        type="text"
                        className="stability-input"
                        aria-label={`Jours de contrôle — ${c.label}`}
                        value={value.days}
                        onChange={(e) =>
                          setSelected((p) => ({ ...p, [c.code]: { ...value, days: e.target.value } }))
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="client-detail-form">
        <label>
          Notes
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p className="clients-status clients-status-error">{error}</p>}
        <div className="client-detail-form-actions">
          <button type="button" className="btn btn-primary" disabled={!valid || busy} onClick={submit}>
            <FlaskConical size={16} /> Lancer {conditions.length} test{conditions.length > 1 ? 's' : ''}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Test detail ─────────────────────────────────────────────────────────

type ObservationForm = {
  day: string
  observedAt: string
  odor: Grade
  color: Grade
  appearance: Appearance
  ph: string
  viscosity: string
  peroxideValue: string
  comment: string
  files: File[]
}

const numberOrNull = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function PhotoThumb({ id, onDelete }: { id: string; onDelete?: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let objectUrl: string | null = null
    fetchPhotoUrl(id)
      .then((u) => {
        objectUrl = u
        setUrl(u)
      })
      .catch(() => setUrl(null))
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return (
    <span className="stability-photo">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Photo de l'échantillon" />
        </a>
      ) : (
        <span className="stability-photo-placeholder" />
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label="Supprimer la photo" title="Supprimer">
          <X size={12} />
        </button>
      )}
    </span>
  )
}

function TestView({
  id,
  catalog,
  onBack,
  onOpen,
}: {
  id: string
  catalog: StabilityCatalog | null
  onBack: () => void
  onOpen: (id: string) => void
}) {
  const [test, setTest] = useState<StabilityTestDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<ObservationForm | null>(null)
  const [closing, setClosing] = useState(false)
  const [conclusion, setConclusion] = useState<Conclusion>('conform')
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setTest(null)
    setForm(null)
    getStabilityTest(id)
      .then((t) => {
        setTest(t)
        setNotes(t.notes ?? '')
      })
      .catch((err) => setError(errorText(err)))
  }, [id])

  async function run<T>(action: () => Promise<T>) {
    setBusy(true)
    setError(null)
    try {
      return await action()
    } catch (err) {
      setError(errorText(err))
      return null
    } finally {
      setBusy(false)
    }
  }

  function openForm(day: number | null) {
    setForm({
      day: day === null ? '' : String(day),
      observedAt: todayIso(),
      odor: 'conform',
      color: 'conform',
      appearance: 'clear',
      ph: '',
      viscosity: '',
      peroxideValue: '',
      comment: '',
      files: [],
    })
  }

  async function saveObservation() {
    if (!form) return
    const result = await run(async () => {
      const { observationId, test: updated } = await addObservation(id, {
        day: form.day === '' ? null : Number(form.day),
        observedAt: form.observedAt,
        odor: form.odor,
        color: form.color,
        appearance: form.appearance,
        ph: numberOrNull(form.ph),
        viscosity: numberOrNull(form.viscosity),
        peroxideValue: numberOrNull(form.peroxideValue),
        comment: form.comment.trim() || undefined,
      })
      let latest = updated
      for (const file of form.files) latest = await uploadPhoto(observationId, file)
      return latest
    })
    if (result) {
      setTest(result)
      setForm(null)
    }
  }

  if (!test) {
    return (
      <div className="clients-page">
        <p className={`clients-status${error ? ' clients-status-error' : ''}`}>{error ?? 'Chargement...'}</p>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const gradeOptions = Object.entries(GRADE_LABEL) as [Grade, string][]

  return (
    <div className="clients-page stability-page">
      <button type="button" className="btn btn-outline clients-back" onClick={onBack}>
        <ArrowLeft size={16} /> Retour aux tests
      </button>

      <div className="client-detail-header">
        <div>
          <h1>{test.formula.name}</h1>
          <p className="stability-subtitle">
            {conditionName(catalog, test)} · {baseName(catalog, test.base)}
            {test.container ? ` · ${test.container}` : ''} · démarré le {formatDate(test.startDate)}
            {test.createdByName ? ` par ${test.createdByName}` : ''}
          </p>
          <span className={`stability-status stability-status-${test.status}`}>
            {STATUS_LABEL[test.status]}
          </span>
          {test.conclusion && (
            <span className={`stability-conclusion stability-conclusion-${test.conclusion}`}>
              {CONCLUSION_LABEL[test.conclusion]}
            </span>
          )}
        </div>
        <div className="stability-actions">
          {test.status === 'in_progress' ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setClosing(true)}>
                <Check size={16} /> Terminer
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={async () => {
                  const t = await run(() => updateStabilityTest(id, { status: 'cancelled' }))
                  if (t) setTest(t)
                }}
              >
                Annuler le test
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={async () => {
                const t = await run(() =>
                  updateStabilityTest(id, { status: 'in_progress', conclusion: null }),
                )
                if (t) setTest(t)
              }}
            >
              <RotateCcw size={16} /> Reprendre
            </button>
          )}
          {confirmDelete ? (
            <>
              <button
                type="button"
                className="btn btn-primary stability-danger"
                disabled={busy}
                onClick={async () => {
                  if ((await run(() => deleteStabilityTest(id))) !== null) onBack()
                }}
              >
                Confirmer la suppression
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Supprimer
            </button>
          )}
        </div>
      </div>

      {error && <p className="clients-status clients-status-error">{error}</p>}

      {closing && (
        <div className="client-detail-form">
          <label>
            Conclusion
            <select value={conclusion} onChange={(e) => setConclusion(e.target.value as Conclusion)}>
              {(Object.entries(CONCLUSION_LABEL) as [Conclusion, string][]).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <div className="client-detail-form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={async () => {
                const t = await run(() =>
                  updateStabilityTest(id, { status: 'completed', conclusion, notes }),
                )
                if (t) {
                  setTest(t)
                  setClosing(false)
                }
              }}
            >
              Enregistrer la conclusion
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setClosing(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {test.campaign.length > 0 && (
        <div className="stability-campaign">
          <span className="stability-muted">Même campagne :</span>
          {test.campaign.map((t) => (
            <button key={t.id} type="button" className="regulations-chip" onClick={() => onOpen(t.id)}>
              {conditionName(catalog, t)}
            </button>
          ))}
        </div>
      )}

      <section className="stability-card">
        <h2>Calendrier des contrôles</h2>
        <div className="stability-timeline">
          {test.checkpointList.map((c) => {
            const due = new Date(c.dueDate)
            const state = c.done
              ? 'done'
              : test.status !== 'in_progress'
                ? 'skipped'
                : due < today
                  ? 'overdue'
                  : due.getTime() === today.getTime()
                    ? 'today'
                    : 'upcoming'
            return (
              <button
                key={c.day}
                type="button"
                className={`stability-step stability-step-${state}`}
                disabled={c.done || test.status !== 'in_progress'}
                onClick={() => openForm(c.day)}
                title={c.done ? 'Contrôle saisi' : 'Saisir ce contrôle'}
              >
                <strong>J+{c.day}</strong>
                <span>{formatDate(c.dueDate)}</span>
                <em>
                  {state === 'done'
                    ? 'Fait'
                    : state === 'overdue'
                      ? 'En retard'
                      : state === 'today'
                        ? "Aujourd'hui"
                        : state === 'skipped'
                          ? 'Non fait'
                          : 'À venir'}
                </em>
              </button>
            )
          })}
        </div>
        {test.status === 'in_progress' && !form && (
          <button type="button" className="btn btn-outline" onClick={() => openForm(test.nextCheckpoint?.day ?? null)}>
            <Plus size={16} /> Saisir une observation
          </button>
        )}
      </section>

      {form && (
        <section className="stability-card">
          <h2>Nouvelle observation</h2>
          <div className="client-detail-form stability-observation-form">
            <div className="client-detail-form-row">
              <label>
                Contrôle
                <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                  <option value="">Contrôle supplémentaire</option>
                  {test.checkpointList.map((c) => (
                    <option key={c.day} value={c.day} disabled={c.done}>
                      J+{c.day}
                      {c.done ? ' (fait)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={form.observedAt}
                  onChange={(e) => setForm({ ...form, observedAt: e.target.value })}
                />
              </label>
            </div>
            <div className="client-detail-form-row">
              <label>
                Odeur
                <select value={form.odor} onChange={(e) => setForm({ ...form, odor: e.target.value as Grade })}>
                  {gradeOptions.map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Couleur
                <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value as Grade })}>
                  {gradeOptions.map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Aspect
                <select
                  value={form.appearance}
                  onChange={(e) => setForm({ ...form, appearance: e.target.value as Appearance })}
                >
                  {(Object.entries(APPEARANCE_LABEL) as [Appearance, string][]).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="client-detail-form-row">
              <label>
                pH
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={14}
                  value={form.ph}
                  onChange={(e) => setForm({ ...form, ph: e.target.value })}
                />
              </label>
              <label>
                Viscosité (mPa·s)
                <input
                  type="number"
                  min={0}
                  value={form.viscosity}
                  onChange={(e) => setForm({ ...form, viscosity: e.target.value })}
                />
              </label>
              <label>
                Indice de peroxyde (mmol/L)
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.peroxideValue}
                  onChange={(e) => setForm({ ...form, peroxideValue: e.target.value })}
                />
              </label>
            </div>
            <label>
              Commentaire
              <textarea
                rows={2}
                placeholder="ex: légère note oxydée en tête, couleur ambrée"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </label>
            <label className="stability-file">
              <Camera size={16} /> Photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setForm({ ...form, files: Array.from(e.target.files ?? []) })}
              />
              {form.files.length > 0 && (
                <span className="stability-muted">{form.files.length} photo(s) sélectionnée(s)</span>
              )}
            </label>
            <div className="client-detail-form-actions">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={saveObservation}>
                Enregistrer
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>
                Annuler
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="stability-card">
        <h2>Observations ({test.observations.length})</h2>
        {test.observations.length === 0 ? (
          <p className="clients-empty">Aucune observation pour le moment.</p>
        ) : (
          <div className="stability-table-wrapper">
            <table className="projects-table stability-table">
              <thead>
                <tr>
                  <th>Contrôle</th>
                  <th>Date</th>
                  <th>Odeur</th>
                  <th>Couleur</th>
                  <th>Aspect</th>
                  <th>pH</th>
                  <th>Viscosité</th>
                  <th>Peroxyde</th>
                  <th>Commentaire</th>
                  <th>Photos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {test.observations.map((o) => (
                  <tr key={o.id} className="stability-row-static">
                    <td className="stability-num">{o.day === null ? 'Suppl.' : `J+${o.day}`}</td>
                    <td className="stability-num">
                      {formatDate(o.observedAt)}
                      {o.observerName && <span className="stability-observer">{o.observerName}</span>}
                    </td>
                    <td>
                      <GradeBadge grade={o.odor} />
                    </td>
                    <td>
                      <GradeBadge grade={o.color} />
                    </td>
                    <td>
                      <span
                        className={`stability-grade stability-grade-${
                          o.appearance === 'clear' ? 'conform' : o.appearance === 'hazy' ? 'slight' : 'altered'
                        }`}
                      >
                        {APPEARANCE_LABEL[o.appearance]}
                      </span>
                    </td>
                    <td className="stability-num">{o.ph ?? '—'}</td>
                    <td className="stability-num">{o.viscosity ?? '—'}</td>
                    <td className="stability-num">{o.peroxideValue ?? '—'}</td>
                    <td className="stability-muted">{o.comment ?? '—'}</td>
                    <td>
                      <span className="stability-photos">
                        {o.photos.map((p) => (
                          <PhotoThumb
                            key={p.id}
                            id={p.id}
                            onDelete={async () => {
                              const t = await run(() => deletePhoto(p.id))
                              if (t) setTest(t)
                            }}
                          />
                        ))}
                        <label className="stability-photo-add" title="Ajouter une photo">
                          <Camera size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              e.target.value = ''
                              if (!file) return
                              const t = await run(() => uploadPhoto(o.id, file))
                              if (t) setTest(t)
                            }}
                          />
                        </label>
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="project-card-delete"
                        disabled={busy}
                        aria-label="Supprimer l'observation"
                        title="Supprimer"
                        onClick={async () => {
                          const t = await run(() => deleteObservation(o.id))
                          if (t) setTest(t)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stability-card">
        <h2>Notes</h2>
        <textarea
          className="stability-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {notes !== (test.notes ?? '') && (
          <div className="client-detail-form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={async () => {
                const t = await run(() => updateStabilityTest(id, { notes }))
                if (t) setTest(t)
              }}
            >
              Enregistrer les notes
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
