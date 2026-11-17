import { Beaker, CircleCheck, Trash2 } from 'lucide-react'
import { formulaAuthor, groupVersions, type FormulaAuthorInfo } from '../data/formulasApi'
import './FormulaLineageTable.css'

export interface LineageFormula extends FormulaAuthorInfo {
  id: string
  name: string
  status: 'draft' | 'completed'
  version: number
  code: string | null
  rootFormulaId: string | null
  finalVersionId: string | null
  createdAt: string
  materializedAs: { id: string } | null
}

interface Props<T extends LineageFormula> {
  formulas: T[]
  /** Ouvre la page de la formule (arbre et liste des versions). */
  onOpenFormula: (id: string) => void
  onDelete?: (id: string) => void
  deletingId?: string | null
  showStatus?: boolean
}

const STATUS_LABEL = { draft: 'Brouillon', completed: 'Finalisée' } as const

/** Une ligne par formule ; le détail des versions est sur la page de la formule. */
export default function FormulaLineageTable<T extends LineageFormula>({
  formulas,
  onOpenFormula,
  onDelete,
  deletingId,
  showStatus = false,
}: Props<T>) {
  const lineages = groupVersions(formulas)

  return (
    <table className="projects-table lineage-table">
      <thead>
        <tr>
          <th>Nom</th>
          {showStatus && <th>Statut</th>}
          <th>Créée par</th>
          <th>Date</th>
          {onDelete && <th />}
        </tr>
      </thead>
      <tbody>
        {lineages.map(({ latest: f, older }) => {
          const count = older.length + 1
          const hasFinal = !!f.finalVersionId
          return (
            <tr key={f.id} onClick={() => onOpenFormula(f.id)}>
              <td>
                <span className="lineage-name">
                  <span className="projects-table-name">{f.name}</span>
                  {count > 1 && <span className="lineage-count">{count} versions</span>}
                  {hasFinal && (
                    <span className="lineage-final" title="Une version finale a été choisie">
                      <CircleCheck size={11} /> Finale
                    </span>
                  )}
                </span>
                {f.materializedAs && (
                  <span className="project-card-tag">
                    <Beaker size={11} /> Transformée en matière première
                  </span>
                )}
              </td>
              {showStatus && <td>{STATUS_LABEL[f.status]}</td>}
              <td className="projects-table-author">{formulaAuthor(f) ?? '—'}</td>
              <td className="projects-table-date">{new Date(f.createdAt).toLocaleDateString()}</td>
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
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
