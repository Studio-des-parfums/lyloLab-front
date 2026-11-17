import { API_URL, apiFetch, readErrorMessage } from './api'

export interface LineageVersion {
  id: string
  name: string
  code: string | null
  version: number
  status: 'draft' | 'completed'
  description: string | null
  finalVersionId: string | null
  totalVolumeMl: number | null
  createdAt: string
  createdByName: string | null
  createdBy: { id: string; name: string } | null
  _count: { notes: number; lines: number }
}

export interface FormulaLineageDetail {
  rootId: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  finalVersionId: string | null
  project: {
    id: string
    name: string
    client: { id: string; company: string | null; contactFirstName: string | null; contactLastName: string | null }
  } | null
  versions: LineageVersion[]
}

export async function fetchLineage(formulaId: string): Promise<FormulaLineageDetail> {
  const res = await apiFetch(`${API_URL}/api/formulas/${formulaId}/lineage`)
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Impossible de charger la formule'))
  return res.json()
}

/**
 * Version dont une autre est issue, déduite de l'identifiant :
 * 123-345-3 vient de 123-345-2 ; 123-345-2-1 vient de 123-345-2.
 */
export function parentCode(code: string): string | null {
  const segments = code.split('-')
  const last = Number(segments[segments.length - 1])
  if (last > 1) return [...segments.slice(0, -1), String(last - 1)].join('-')
  if (segments.length > 3) return segments.slice(0, -1).join('-')
  return null
}

export interface GraphNode {
  version: LineageVersion
  parentId: string | null
  /** Ligne horizontale (0 = tronc principal, puis une ligne par branche). */
  lane: number
  /** Position le long de l'axe des étapes. */
  step: number
}

/** Place les versions en arbre : chaque branche (préfixe de code) occupe sa propre ligne. */
export function layoutLineage(versions: LineageVersion[]): GraphNode[] {
  const byCode = new Map(versions.filter((v) => v.code).map((v) => [v.code!, v]))
  const branchKey = (code: string) => code.split('-').slice(0, -1).join('-')
  const lanes = new Map<string, number>()
  const nodes = new Map<string, GraphNode>()

  // On traite dans l'ordre de création pour que les parents soient placés avant leurs enfants.
  const ordered = [...versions].sort((a, b) => a.version - b.version)
  for (const v of ordered) {
    const pCode = v.code ? parentCode(v.code) : null
    const parent = pCode ? byCode.get(pCode) : undefined
    const parentNode = parent ? nodes.get(parent.id) : undefined
    const key = v.code ? branchKey(v.code) : `legacy-${v.id}`
    if (!lanes.has(key)) lanes.set(key, lanes.size)
    nodes.set(v.id, {
      version: v,
      parentId: parent?.id ?? null,
      lane: lanes.get(key)!,
      step: parentNode ? parentNode.step + 1 : 0,
    })
  }
  return [...nodes.values()]
}
