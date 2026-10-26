import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Beaker,
  CalendarClock,
  ChevronRight,
  FlaskConical,
  OctagonX,
  PackageX,
  Plus,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import {
  fetchDashboard,
  type DashboardDeadline,
  type DashboardOverview,
  type DashboardRegulatoryItem,
  type StockAlertLevel,
} from '../data/dashboardApi'
import { formatGrams } from '../data/materials'
import './DashboardPage.css'

interface DashboardPageProps {
  onOpenFormula: (id: string, projectId: string | null) => void
  onOpenProject: (projectId: string) => void
  onNewFormula: () => void
  onOpenMaterials: () => void
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const todayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const percentFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count > 1 ? pluralForm : singular}`

function deadlineLabel(deadline: DashboardDeadline): string {
  if (deadline.daysLeft < 0) return `En retard de ${plural(-deadline.daysLeft, 'jour')}`
  if (deadline.daysLeft === 0) return "Aujourd'hui"
  return `Dans ${plural(deadline.daysLeft, 'jour')}`
}

const STOCK_LEVEL: Record<StockAlertLevel, { label: string; icon: ReactNode; badge: string }> = {
  out: { label: 'Rupture', icon: <PackageX size={12} />, badge: 'home-badge-violation' },
  low: { label: 'Stock bas', icon: <AlertTriangle size={12} />, badge: 'home-badge-warning' },
  missing: { label: 'Hors inventaire', icon: <PackageX size={12} />, badge: 'home-badge-neutral' },
}

function regulatoryDetails(item: DashboardRegulatoryItem): string[] {
  const details: string[] = []
  if (item.banned.length) details.push(`Interdite en Cat.4 : ${item.banned.join(', ')}`)
  if (item.exceeded.length) details.push(`Dépasse la limite IFRA : ${item.exceeded.join(', ')}`)
  if (item.capped.length) details.push(`Au plafond IFRA : ${item.capped.join(', ')}`)
  if (item.overlappingAllergens.length) {
    details.push(`Allergènes cumulés : ${item.overlappingAllergens.join(', ')}`)
  }
  return details
}

function Card({
  title,
  icon,
  action,
  children,
  wide = false,
}: {
  title: string
  icon: ReactNode
  action?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <section className={wide ? 'home-card home-card-wide' : 'home-card'}>
      <div className="home-card-head">
        <h2>
          {icon} {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage({
  onOpenFormula,
  onOpenProject,
  onNewFormula,
  onOpenMaterials,
}: DashboardPageProps) {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetchDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const [today] = useState(() => todayFormat.format(new Date()))

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1>Tableau de bord</h1>
          <p>{today.charAt(0).toUpperCase() + today.slice(1)}</p>
        </div>
        <div className="home-header-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={load}
            disabled={loading}
            aria-label="Actualiser"
          >
            <RefreshCw size={16} />
          </button>
          <button type="button" className="btn btn-primary" onClick={onNewFormula}>
            <Plus size={16} /> Nouvelle formule
          </button>
        </div>
      </div>

      {loading && !data && <p className="home-status">Chargement...</p>}
      {error && (
        <p className="home-status home-status-error">
          Impossible de charger le tableau de bord : {error}.
        </p>
      )}

      {data && (
        <>
          {/* 1. Key figures */}
          <div className="home-kpis">
            <div className="home-kpi">
              <span className="home-kpi-label">Formules</span>
              <span className="home-kpi-value">
                {data.kpis.draftFormulas + data.kpis.completedFormulas}
              </span>
              <span className="home-kpi-sub">
                {plural(data.kpis.draftFormulas, 'brouillon')} ·{' '}
                {plural(data.kpis.completedFormulas, 'finalisée')}
              </span>
            </div>
            <div className="home-kpi">
              <span className="home-kpi-label">Créées ce mois-ci</span>
              <span className="home-kpi-value">{data.kpis.formulasThisMonth}</span>
              <span className="home-kpi-sub">nouvelles formules</span>
            </div>
            <div className="home-kpi">
              <span className="home-kpi-label">Projets en cours</span>
              <span className="home-kpi-value">{data.kpis.activeProjects}</span>
              <span className="home-kpi-sub">{plural(data.kpis.clients, 'client')}</span>
            </div>
            <div className="home-kpi">
              <span className="home-kpi-label">Matières premières</span>
              <span className="home-kpi-value">
                {data.kpis.materials.toLocaleString('fr-FR')}
              </span>
              {data.kpis.outOfStockMaterials > 0 ? (
                <span className="home-kpi-sub home-kpi-sub-alert">
                  <PackageX size={13} /> {plural(data.kpis.outOfStockMaterials, 'en rupture', 'en rupture')}
                </span>
              ) : (
                <span className="home-kpi-sub">aucune rupture</span>
              )}
            </div>
          </div>

          <div className="home-grid">
            {/* 2. Deadlines */}
            <Card title="Échéances projets" icon={<CalendarClock size={16} />}>
              {data.deadlines.length === 0 ? (
                <p className="home-empty">Aucune échéance dans les 30 prochains jours.</p>
              ) : (
                <ul className="home-list">
                  {data.deadlines.map((deadline) => (
                    <li key={deadline.projectId}>
                      <button
                        type="button"
                        className="home-row"
                        onClick={() => onOpenProject(deadline.projectId)}
                      >
                        <span className="home-row-main">
                          <span className="home-row-title">{deadline.projectName}</span>
                          <span className="home-row-meta">
                            {deadline.clientName} · {dateFormat.format(new Date(deadline.endDate))} ·{' '}
                            {plural(deadline.draftCount, 'brouillon')},{' '}
                            {plural(deadline.completedCount, 'finalisée')}
                          </span>
                        </span>
                        <span
                          className={`home-badge ${
                            deadline.daysLeft < 0
                              ? 'home-badge-violation'
                              : deadline.daysLeft <= 7
                                ? 'home-badge-warning'
                                : 'home-badge-neutral'
                          }`}
                        >
                          {deadline.daysLeft < 0 && <AlertTriangle size={12} />}
                          {deadlineLabel(deadline)}
                        </span>
                        <ChevronRight size={16} className="home-row-chevron" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* 3. Resume work */}
            <Card title="Reprendre un brouillon" icon={<FlaskConical size={16} />}>
              {data.recentDrafts.length === 0 ? (
                <p className="home-empty">Aucun brouillon en cours.</p>
              ) : (
                <ul className="home-list">
                  {data.recentDrafts.map((draft) => (
                    <li key={draft.id}>
                      <button
                        type="button"
                        className="home-row"
                        onClick={() => onOpenFormula(draft.id, draft.projectId)}
                      >
                        <span className="home-row-main">
                          <span className="home-row-title">{draft.name}</span>
                          <span className="home-row-meta">
                            {draft.projectName
                              ? `${draft.clientName} · ${draft.projectName}`
                              : 'Formule personnelle'}{' '}
                            · {plural(draft.materialCount, 'matière')} · créée le{' '}
                            {dateFormat.format(new Date(draft.createdAt))}
                          </span>
                        </span>
                        <ChevronRight size={16} className="home-row-chevron" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* 4. Stock alerts */}
            <Card
              title="Alertes de stock"
              icon={<PackageX size={16} />}
              action={
                <button type="button" className="home-link" onClick={onOpenMaterials}>
                  Matières premières <ChevronRight size={14} />
                </button>
              }
            >
              <p className="home-card-hint">
                Matières utilisées dans vos formules, en rupture ou sous {data.lowStockGrams} g.
              </p>
              {data.stockAlerts.length === 0 ? (
                <p className="home-empty">Toutes les matières de vos formules sont en stock.</p>
              ) : (
                <>
                  <ul className="home-list">
                    {data.stockAlerts.map((alert) => (
                      <li key={alert.materialId} className="home-row home-row-static">
                        <span className="home-row-main">
                          <span className="home-row-title">{alert.name}</span>
                          <span className="home-row-meta">
                            {alert.locations.length > 0
                              ? `📍 ${alert.locations.join(', ')}`
                              : 'Emplacement inconnu'}
                            {alert.suppliers.length > 0 && ` · ${alert.suppliers.join(', ')}`} ·{' '}
                            dans {plural(alert.formulaCount, 'formule')}
                          </span>
                        </span>
                        <span className={`home-badge ${STOCK_LEVEL[alert.level].badge}`}>
                          {STOCK_LEVEL[alert.level].icon}
                          {STOCK_LEVEL[alert.level].label}
                          {alert.level === 'low' && alert.stockGrams !== null &&
                            ` · ${formatGrams(alert.stockGrams)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {data.stockAlertTotal > data.stockAlerts.length && (
                    <p className="home-more">
                      + {plural(data.stockAlertTotal - data.stockAlerts.length, 'autre alerte', 'autres alertes')}
                    </p>
                  )}
                </>
              )}
            </Card>

            {/* 5. Most used materials */}
            <Card title="Matières les plus utilisées" icon={<TrendingUp size={16} />}>
              {data.topMaterials.length === 0 ? (
                <p className="home-empty">Aucune formule enregistrée pour le moment.</p>
              ) : (
                <TopMaterialsChart materials={data.topMaterials} />
              )}
            </Card>

            {/* 6. Regulatory review */}
            <Card
              wide
              title="Vérification réglementaire"
              icon={<ShieldAlert size={16} />}
            >
              <p className="home-card-hint">
                Formules avec une matière interdite, au-delà ou au plafond de sa limite IFRA
                Cat.4, ou des allergènes apportés par plusieurs matières.
              </p>
              {data.regulatory.length === 0 ? (
                <p className="home-empty">Aucune formule à vérifier.</p>
              ) : (
                <>
                  <ul className="home-list">
                    {data.regulatory.map((item) => (
                      <li key={item.formulaId}>
                        <button
                          type="button"
                          className="home-row"
                          onClick={() => onOpenFormula(item.formulaId, item.projectId)}
                        >
                          <span
                            className={`home-badge home-badge-${item.level} home-badge-fixed`}
                          >
                            {item.level === 'violation' ? (
                              <OctagonX size={12} />
                            ) : (
                              <AlertTriangle size={12} />
                            )}
                            {item.level === 'violation' ? 'Non conforme' : 'À vérifier'}
                          </span>
                          <span className="home-row-main">
                            <span className="home-row-title">
                              {item.name}
                              <span className="home-row-tag">
                                {item.status === 'completed' ? 'Finalisée' : 'Brouillon'}
                              </span>
                            </span>
                            <span className="home-row-meta">
                              {item.projectName
                                ? `${item.clientName} · ${item.projectName}`
                                : 'Formule personnelle'}
                            </span>
                            {regulatoryDetails(item).map((detail) => (
                              <span key={detail} className="home-row-detail">
                                {detail}
                              </span>
                            ))}
                          </span>
                          <ChevronRight size={16} className="home-row-chevron" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {data.regulatoryTotal > data.regulatory.length && (
                    <p className="home-more">
                      + {plural(data.regulatoryTotal - data.regulatory.length, 'autre formule', 'autres formules')}
                    </p>
                  )}
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function TopMaterialsChart({ materials }: { materials: DashboardOverview['topMaterials'] }) {
  const max = Math.max(...materials.map((m) => m.formulaCount))

  return (
    <ul className="home-bars" aria-label="Nombre de formules utilisant chaque matière">
      {materials.map((material) => {
        const detail = `${plural(material.formulaCount, 'formule')} · ${percentFormat.format(
          material.averagePercent,
        )} % en moyenne`
        return (
          <li key={material.materialId} className="home-bar-row" tabIndex={0}>
            <span className="home-bar-label" title={material.name}>
              {material.name}
            </span>
            <span className="home-bar-track">
              <span
                className="home-bar"
                style={{ width: `${(material.formulaCount / max) * 100}%` }}
              />
            </span>
            <span className="home-bar-value">{material.formulaCount}</span>
            <span className="home-bar-tip" role="tooltip">
              <strong>{material.name}</strong>
              {detail}
            </span>
          </li>
        )
      })}
      <li className="home-bars-caption">
        <Beaker size={12} /> Nombre de formules contenant la matière
      </li>
    </ul>
  )
}
