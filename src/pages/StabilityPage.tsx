import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bell, CalendarDays, Camera, Check, FlaskConical, Package, Pencil, Plus, RotateCcw, Search, Timer, Trash2, X } from 'lucide-react'
import { listFormulas, type FormulaSummary } from '../data/formulasApi'
import { fetchTeam, type TeamMember } from '../data/authApi'
import { useAuth } from '../context/AuthContext'
import {
  APPEARANCE_LABEL,
  CONCLUSION_LABEL,
  GRADE_LABEL,
  STATUS_LABEL,
  addObservation,
  createStabilityCampaign,
  deleteDailyNote,
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
  saveDailyNote,
  sendReminderPreview,
  setWatchers,
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
const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = () => toIsoDate(new Date())
const DAY_MS = 24 * 60 * 60 * 1000
/** Local midnight of a YYYY-MM-DD (or ISO) date. */
const localDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (iso: string, days: number) => {
  const d = localDay(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}
const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((localDay(toIso).getTime() - localDay(fromIso).getTime()) / DAY_MS)

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

const GRADE_RANK: Record<Grade, number> = { conform: 0, slight: 1, altered: 2 }
const CONCLUSION_RANK: Record<Conclusion, number> = { conform: 0, minor: 1, non_conform: 2 }

/** Aggregates the tests of a campaign for one table row (worst result wins). */
function campaignSummary(tests: StabilityTest[]) {
  const first = tests[0]
  const all = tests.flatMap((t) => t.checkpointList)
  const done = all.filter((c) => c.done).length
  const next =
    tests
      .map((t) => t.nextCheckpoint)
      .filter((c): c is NonNullable<typeof c> => !!c)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null
  const grades = tests.map((t) => t.worstGrade).filter((g): g is Grade => !!g)
  const conclusions = tests.map((t) => t.conclusion).filter((c): c is Conclusion => !!c)
  const status: TestStatus = tests.some((t) => t.status === 'in_progress')
    ? 'in_progress'
    : tests.some((t) => t.status === 'completed')
      ? 'completed'
      : 'cancelled'
  return {
    first,
    tests,
    done,
    total: all.length,
    progress: all.length ? done / all.length : 0,
    next,
    overdue: tests.reduce((n, t) => n + t.overdueCount, 0),
    worstGrade: grades.length ? grades.reduce((a, b) => (GRADE_RANK[b] > GRADE_RANK[a] ? b : a)) : null,
    // Only shown once every test of the campaign is concluded.
    conclusion:
      status !== 'in_progress' && conclusions.length
        ? conclusions.reduce((a, b) => (CONCLUSION_RANK[b] > CONCLUSION_RANK[a] ? b : a))
        : null,
    status,
  }
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

  // One row per campaign (a formula launched under several conditions).
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const groups = new Map<string, StabilityTest[]>()
    for (const t of tests ?? []) {
      const list = groups.get(t.campaignId)
      if (list) list.push(t)
      else groups.set(t.campaignId, [t])
    }
    return [...groups.values()]
      .map((list) => campaignSummary(list))
      .filter(
        (c) =>
          !q ||
          `${c.first.formula.name} ${c.tests.map((t) => conditionName(catalog, t)).join(' ')}`
            .toLowerCase()
            .includes(q),
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
              <th>Conditions</th>
              <th>Base</th>
              <th>Début</th>
              <th>Avancement</th>
              <th>Prochain contrôle</th>
              <th>Résultat</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr
                key={c.first.campaignId}
                tabIndex={0}
                onClick={() => onOpenTest(c.first.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpenTest(c.first.id)
                }}
              >
                <td>
                  <span className="projects-table-name">{c.first.formula.name}</span>
                </td>
                <td>
                  <span className="stability-condition-chips">
                    {c.tests.map((t) => (
                      <span key={t.id} className={`stability-condition-chip stability-condition-chip-${t.status}`}>
                        {conditionName(catalog, t)}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="stability-muted">{baseName(catalog, c.first.base)}</td>
                <td className="stability-num">{formatDate(c.first.startDate)}</td>
                <td className="stability-num">
                  <span className="stability-progress">
                    <span style={{ width: `${Math.round(c.progress * 100)}%` }} />
                  </span>
                  {c.done}/{c.total}
                </td>
                <td className="stability-num">
                  {c.next ? (
                    <>
                      {formatDate(c.next.dueDate)}
                      {c.overdue > 0 && <span className="stability-due stability-due-overdue">En retard</span>}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {c.conclusion ? (
                    <span className={`stability-conclusion stability-conclusion-${c.conclusion}`}>
                      {CONCLUSION_LABEL[c.conclusion]}
                    </span>
                  ) : (
                    <GradeBadge grade={c.worstGrade} />
                  )}
                </td>
                <td>
                  <span className={`stability-status stability-status-${c.status}`}>
                    {STATUS_LABEL[c.status]}
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
  [...new Set(text.split(/[\s,;]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0))].sort(
    (a, b) => a - b,
  )

// ── Email reminders ─────────────────────────────────────────────────────

function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  useEffect(() => {
    fetchTeam()
      .then((t) => setMembers(t.members))
      .catch(() => setMembers([]))
  }, [])
  return members
}

/** Toggle chips of team members; `fixed` is always on (the creator). */
function MemberPicker({
  members,
  fixed,
  value,
  onChange,
}: {
  members: TeamMember[]
  fixed: { id: string; name: string } | null
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const others = members.filter((m) => m.id !== fixed?.id)
  return (
    <div className="stability-members">
      {fixed && (
        <span className="stability-member fixed" title="Le créateur du test reçoit toujours les alertes">
          <Check size={13} /> {fixed.name} <em>créateur</em>
        </span>
      )}
      {others.map((m) => {
        const on = value.includes(m.id)
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={on}
            className={`stability-member${on ? ' on' : ''}`}
            title={m.email}
            onClick={() => onChange(on ? value.filter((id) => id !== m.id) : [...value, m.id])}
          >
            {on ? <Check size={13} /> : <Plus size={13} />} {m.name}
          </button>
        )
      })}
      {others.length === 0 && <span className="stability-muted">Personne d'autre dans l'équipe.</span>}
    </div>
  )
}

function RemindersCard({
  test,
  busy,
  onSave,
}: {
  test: StabilityTest
  busy: boolean
  onSave: (userIds: string[]) => void
}) {
  const members = useTeamMembers()
  const saved = test.watchers.map((w) => w.user.id)
  const [value, setValue] = useState(saved)
  const [preview, setPreview] = useState<string | null>(null)
  const savedKey = [...saved].sort().join()
  useEffect(() => setValue(savedKey ? savedKey.split(',') : []), [savedKey])
  const dirty = [...value].sort().join() !== savedKey

  return (
    <section className="stability-card">
      <h2>
        <Bell size={16} /> Alertes email
      </h2>
      <p className="stability-muted">
        Chaque matin à 8 h, un seul mail par personne récapitule les contrôles du jour et en retard.
        Les destinataires sont communs à toutes les conditions du lancement.
      </p>
      <MemberPicker members={members} fixed={test.createdBy} value={value} onChange={setValue} />
      <div className="client-detail-form-actions">
        {dirty && (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onSave(value)}>
            Enregistrer les destinataires
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={async () => {
            setPreview('Envoi…')
            try {
              const r = await sendReminderPreview()
              setPreview(`Aperçu envoyé à ${r.email} (${r.items} contrôle${r.items > 1 ? 's' : ''}).`)
            } catch (err) {
              setPreview(errorText(err))
            }
          }}
        >
          M'envoyer mon récapitulatif maintenant
        </button>
      </div>
      {preview && <p className="stability-muted">{preview}</p>}
    </section>
  )
}

function FormulaPicker({
  formulas,
  value,
  onChange,
}: {
  formulas: FormulaSummary[]
  value: string
  onChange: (id: string) => void
}) {
  const selected = formulas.find((f) => f.id === value)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const normalize = (t: string) =>
    t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const results = useMemo(() => {
    const q = normalize(query.trim())
    return q ? formulas.filter((f) => normalize(f.name).includes(q)) : formulas
  }, [formulas, query])

  function pick(f: FormulaSummary) {
    onChange(f.id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="stability-field stability-combobox">
      <div className="stability-combobox-input">
        <Search size={16} />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={selected ? selected.name : 'Rechercher une formule…'}
          className={selected && !query ? 'has-value' : ''}
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setActive((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter' && open && results[active]) {
              e.preventDefault()
              pick(results[active])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {selected && (
          <button
            type="button"
            className="stability-combobox-clear"
            aria-label="Retirer la formule"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('')
              setQuery('')
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <ul className="stability-combobox-list" role="listbox">
          {results.length === 0 ? (
            <li className="stability-combobox-empty">Aucune formule ne correspond.</li>
          ) : (
            results.map((f, i) => (
              <li
                key={f.id}
                role="option"
                aria-selected={f.id === value}
                className={`${i === active ? 'active' : ''}${f.id === value ? ' selected' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(f)
                }}
              >
                <span>{f.name}</span>
                {f.status === 'completed' && <em>Finalisée</em>}
                {f.id === value && <Check size={14} />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

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
  const [base, setBase] = useState('')
  const [container, setContainer] = useState('')
  const [startDate, setStartDate] = useState('')
  const [durationDays, setDurationDays] = useState('')
  const [watcherIds, setWatcherIds] = useState<string[]>([])
  const members = useTeamMembers()
  const { user } = useAuth()
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
            r.recommended.map((rec) => [rec.condition, { days: '', label: '' }]),
          ),
        )
      })
      .catch((err) => setError(errorText(err)))
  }, [formulaId, catalog])

  function toggle(code: string, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev }
      if (checked) next[code] = { days: '', label: '' }
      else delete next[code]
      return next
    })
  }

  // Empty fields fall back to the value shown as placeholder.
  const defaultDays = (code: string) => catalog?.conditions.find((c) => c.code === code)?.checkpoints ?? []
  const conditions = Object.entries(selected).map(([condition, v]) => ({
    condition,
    conditionLabel: v.label.trim() || undefined,
    checkpoints: v.days.trim() ? parseDays(v.days) : defaultDays(condition),
  }))
  const effectiveStart = startDate || todayIso()
  const duration = durationDays.trim() ? Number(durationDays) : null
  const durationValid = duration === null || (Number.isInteger(duration) && duration > 0)
  const deadline = duration && durationValid ? addDays(effectiveStart, duration) : null
  const valid =
    !!formulaId &&
    conditions.length > 0 &&
    conditions.every((c) => c.checkpoints.length > 0) &&
    durationValid &&
    (!selected.other || !!selected.other.label.trim())

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await createStabilityCampaign({
        formulaId,
        base: base || undefined,
        container: container.trim() || undefined,
        startDate: effectiveStart,
        deadline: deadline ?? undefined,
        watcherIds: watcherIds.length ? watcherIds : undefined,
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

      <section className="stability-card stability-setup">
        <div className="stability-setup-group stability-setup-formula">
          <div className="stability-setup-title">
            <FlaskConical size={16} />
            <div>
              <h2>Formule</h2>
              <p className="stability-muted">La formule à tester. Ses risques connus s'affichent dessous.</p>
            </div>
          </div>
          <FormulaPicker formulas={formulas} value={formulaId} onChange={setFormulaId} />
        </div>

        <div className="stability-setup-columns">
          <div className="stability-setup-group">
            <div className="stability-setup-title">
              <Package size={16} />
              <div>
                <h2>Échantillon</h2>
                <p className="stability-muted">Base et conditionnement du produit testé.</p>
              </div>
            </div>
            <label className="stability-field">
              <span>Base testée</span>
              <select value={base} onChange={(e) => setBase(e.target.value)}>
                <option value="">Alcool (par défaut)</option>
                {catalog?.bases.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="stability-field">
              <span>Contenant</span>
              <input
                type="text"
                placeholder="ex : flacon verre transparent 30 ml, pompe"
                value={container}
                onChange={(e) => setContainer(e.target.value)}
              />
            </label>
          </div>

          <div className="stability-setup-group">
            <div className="stability-setup-title">
              <CalendarDays size={16} />
              <div>
                <h2>Calendrier</h2>
                <p className="stability-muted">Démarrage et échéance optionnelle.</p>
              </div>
            </div>
            <div className="stability-field-row">
              <label className="stability-field">
                <span>Date de début</span>
                <input
                  type="date"
                  value={startDate}
                  title="Vide = aujourd'hui"
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <small>{startDate ? '' : "Vide = aujourd'hui"}</small>
              </label>
              <label className="stability-field">
                <span>
                  Durée <em>optionnel</em>
                </span>
                <div className="stability-suffix-input">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="ex : 7"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                  />
                  <span>jours</span>
                </div>
                {!durationValid && <small className="clients-status-error">Nombre entier &gt; 0</small>}
              </label>
            </div>
            {deadline && (
              <div className="stability-deadline-chip">
                <Timer size={14} /> Fin prévue le <strong>{formatDate(deadline)}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="stability-card stability-setup">
        <div className="stability-setup-group">
          <div className="stability-setup-title">
            <Bell size={16} />
            <div>
              <h2>Alertes email</h2>
              <p className="stability-muted">
                Un mail récapitulatif chaque matin quand des contrôles sont à faire. Vous le recevez
                automatiquement ; ajoutez d'autres membres de l'équipe si besoin.
              </p>
            </div>
          </div>
          <MemberPicker
            members={members}
            fixed={user ? { id: user.id, name: user.name } : null}
            value={watcherIds}
            onChange={setWatcherIds}
          />
        </div>
      </section>

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
            Les tests conseillés sont pré-cochés. Laissez les jours de contrôle vides pour utiliser
            ceux proposés en exemple.
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
                        placeholder={`Jours de contrôle, ex : ${c.checkpoints.join(', ')}`}
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
          <textarea
            rows={2}
            placeholder="ex : lot pilote, macération 48 h avant mise en test"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    let objectUrl: string | null = null
    fetchPhotoUrl(id)
      .then((u) => {
        objectUrl = u
        setUrl(u)
      })
      .catch(() => setUrl(null))
    return () => {
      if (objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return (
    <span className={`stability-photo${confirming ? ' confirming' : ''}`}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Photo de l'échantillon" />
        </a>
      ) : (
        <span className="stability-photo-placeholder" />
      )}
      {onDelete && !confirming && (
        <button
          type="button"
          className="stability-photo-remove"
          onClick={() => setConfirming(true)}
          aria-label="Supprimer la photo"
          title="Supprimer"
        >
          <X size={12} />
        </button>
      )}
      {onDelete && confirming && (
        <span className="stability-photo-confirm" role="group" aria-label="Supprimer la photo ?">
          <span>Supprimer ?</span>
          <span className="stability-photo-confirm-actions">
            <button
              type="button"
              className="yes"
              autoFocus
              aria-label="Confirmer la suppression"
              title="Confirmer"
              onClick={() => {
                setConfirming(false)
                onDelete()
              }}
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              aria-label="Annuler"
              title="Annuler"
              onClick={() => setConfirming(false)}
              onKeyDown={(e) => e.key === 'Escape' && setConfirming(false)}
            >
              <X size={12} />
            </button>
          </span>
        </span>
      )}
    </span>
  )
}

// ── Deadline countdown & daily notes ───────────────────────────────────

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** "J-3", "Jour J", "J+2" relative to the deadline, or "J+n" from the start. */
function dayLabel(test: StabilityTest, dateIso: string) {
  if (test.deadline) {
    const n = daysBetween(dateIso, test.deadline)
    return n > 0 ? `J-${n}` : n === 0 ? 'Jour J' : `J+${-n} (après échéance)`
  }
  return `J+${daysBetween(test.startDate, dateIso)}`
}

function Countdown({ test }: { test: StabilityTest }) {
  const now = useNow(1000)
  if (!test.deadline) return null
  const end = localDay(test.deadline).getTime()
  const start = localDay(test.startDate).getTime()
  const left = end - now
  const total = Math.max(end - start, 1)
  const ratio = Math.min(Math.max((now - start) / total, 0), 1)
  const abs = Math.abs(left)
  const d = Math.floor(abs / DAY_MS)
  const h = Math.floor((abs % DAY_MS) / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const sec = Math.floor((abs % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const running = test.status === 'in_progress'
  return (
    <div className={`stability-countdown${left < 0 && running ? ' overdue' : ''}`}>
      <div className="stability-countdown-time">
        {running ? (
          <>
            <strong>
              {d}j {pad(h)}h {pad(m)}min {pad(sec)}s
            </strong>
            <span>{left >= 0 ? 'restants' : 'de dépassement'}</span>
          </>
        ) : (
          <strong>Chrono arrêté ({STATUS_LABEL[test.status].toLowerCase()})</strong>
        )}
      </div>
      <div className="stability-countdown-bar">
        <div style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="stability-countdown-dates stability-muted">
        <span>Début {formatDate(test.startDate)}</span>
        <span>Fin {formatDate(test.deadline)}</span>
      </div>
    </div>
  )
}

function DeadlineCard({
  test,
  busy,
  onSave,
}: {
  test: StabilityTest
  busy: boolean
  onSave: (deadline: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  return (
    <section className="stability-card">
      <h2>
        <Timer size={16} /> Échéance
      </h2>
      {test.deadline ? (
        <Countdown test={test} />
      ) : (
        !editing && <p className="stability-muted">Pas de deadline pour ce test.</p>
      )}
      {editing ? (
        <div className="client-detail-form-actions">
          <input
            type="date"
            className="stability-input"
            min={test.startDate.slice(0, 10)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !value}
            onClick={() => {
              onSave(value)
              setEditing(false)
            }}
          >
            Enregistrer
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
            Annuler
          </button>
        </div>
      ) : (
        <div className="client-detail-form-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setValue(test.deadline?.slice(0, 10) ?? '')
              setEditing(true)
            }}
          >
            <Pencil size={14} /> {test.deadline ? 'Modifier' : 'Ajouter une deadline'}
          </button>
          {test.deadline && (
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => onSave(null)}>
              Retirer
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function DailyNotesCard({
  test,
  busy,
  onSave,
  onDelete,
}: {
  test: StabilityTest
  busy: boolean
  onSave: (date: string, content: string) => Promise<boolean>
  onDelete: (id: string) => void
}) {
  const [date, setDate] = useState(todayIso())
  const [content, setContent] = useState('')
  const existing = test.dailyNotes.find((n) => n.date.slice(0, 10) === date)

  return (
    <section className="stability-card">
      <h2>Suivi quotidien ({test.dailyNotes.length})</h2>
      <div className="client-detail-form stability-daily-form">
        <div className="client-detail-form-row">
          <label>
            Jour
            <input
              type="date"
              min={test.startDate.slice(0, 10)}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setContent('')
              }}
            />
            {date && <span className="stability-muted">{dayLabel(test, date)}</span>}
          </label>
        </div>
        <label>
          Note du jour
          <textarea
            rows={2}
            placeholder={existing ? existing.content : 'ex : RAS, légère opalescence, odeur stable…'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {existing && (
            <span className="stability-muted">Une note existe déjà ce jour-là : elle sera remplacée.</span>
          )}
        </label>
        <div className="client-detail-form-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !date || !content.trim()}
            onClick={async () => {
              if (await onSave(date, content.trim())) setContent('')
            }}
          >
            Enregistrer la note
          </button>
        </div>
      </div>

      {test.dailyNotes.length === 0 ? (
        <p className="clients-empty">Aucune note quotidienne.</p>
      ) : (
        <ul className="stability-daily-list">
          {test.dailyNotes.map((n) => (
            <li key={n.id}>
              <div className="stability-daily-head">
                <strong>{dayLabel(test, n.date)}</strong>
                <span className="stability-muted">
                  {formatDate(n.date.slice(0, 10))}
                  {n.authorName ? ` · ${n.authorName}` : ''}
                </span>
                <button
                  type="button"
                  className="project-card-delete"
                  disabled={busy}
                  aria-label="Supprimer la note"
                  title="Supprimer"
                  onClick={() => onDelete(n.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p>{n.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
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
        <div className="stability-condition-tabs" role="tablist">
          {[test, ...test.campaign]
            .sort((a, b) => conditionName(catalog, a).localeCompare(conditionName(catalog, b)))
            .map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === test.id}
                className={t.id === test.id ? 'active' : ''}
                onClick={() => t.id !== test.id && onOpen(t.id)}
              >
                {conditionName(catalog, t)}
                <span className={`stability-tab-dot stability-tab-dot-${t.status}`} />
              </button>
            ))}
        </div>
      )}

      <DeadlineCard
        test={test}
        busy={busy}
        onSave={async (deadline) => {
          const t = await run(() => updateStabilityTest(id, { deadline }))
          if (t) setTest(t)
        }}
      />

      <RemindersCard
        test={test}
        busy={busy}
        onSave={async (userIds) => {
          const t = await run(() => setWatchers(id, userIds))
          if (t) setTest(t)
        }}
      />

      <DailyNotesCard
        test={test}
        busy={busy}
        onSave={async (date, content) => {
          const t = await run(() => saveDailyNote(id, { date, content }))
          if (t) setTest(t)
          return !!t
        }}
        onDelete={async (noteId) => {
          const t = await run(() => deleteDailyNote(noteId))
          if (t) setTest(t)
        }}
      />

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
