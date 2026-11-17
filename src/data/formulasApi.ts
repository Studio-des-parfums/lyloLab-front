import { API_URL, apiFetch } from './api'

export interface CreateFormulaLinePayload {
  materialId: string
  quantity: number
}

export type FormulaStatus = 'draft' | 'completed'

export interface CreateFormulaPayload {
  name: string
  description?: string | null
  facets: Record<string, number>
  adjustments: Record<string, number>
  lines: CreateFormulaLinePayload[]
  totalVolumeMl?: number | null
  status?: FormulaStatus
  projectId?: string | null
  /** Crée une nouvelle version de cette formule. */
  versionOfId?: string
}

export interface FormulaProjectInfo {
  id: string
  name: string
  client: {
    id: string
    company: string | null
    contactFirstName: string | null
    contactLastName: string | null
  }
}

/** Who created a formula: the live account, or the name kept once that account is removed. */
export interface FormulaAuthorInfo {
  createdBy: { id: string; name: string } | null
  createdByName: string | null
}

/** Name to show as the formula's author, or null for formulas made before authors were tracked. */
export function formulaAuthor(formula: FormulaAuthorInfo): string | null {
  return formula.createdBy?.name ?? formula.createdByName
}

export interface FormulaSummary extends FormulaAuthorInfo {
  id: string
  name: string
  status: FormulaStatus
  version: number
  /** Identifiant lisible : XXX-XXX-n (branche : XXX-XXX-n-m). */
  code: string | null
  rootFormulaId: string | null
  /** Version retenue comme finale pour toute la formule. */
  finalVersionId: string | null
  /** Résultat visé, commun à toutes les versions. */
  description: string | null
  totalVolumeMl: number | null
  createdAt: string
  materializedAs: { id: string } | null
  project: FormulaProjectInfo | null
  _count?: { notes: number }
}

export interface FormulaLineDetail {
  quantity: number
  material: {
    id: string
    casNumber: string | null
    name: string
    family: string | null
    sensation: string | null
    weight: number | null
    subjectivePower: number | null
    descriptors: Record<string, number>
    source: string
    regulatory: unknown
  }
}

export interface FormulaDetail extends FormulaAuthorInfo {
  id: string
  name: string
  status: FormulaStatus
  version: number
  /** Identifiant lisible : XXX-XXX-n (branche : XXX-XXX-n-m). */
  code: string | null
  rootFormulaId: string | null
  /** Version retenue comme finale pour toute la formule. */
  finalVersionId: string | null
  /** Résultat visé, commun à toutes les versions. */
  description: string | null
  facets: Record<string, number>
  adjustments: Record<string, number>
  totalVolumeMl: number | null
  createdAt: string
  lines: FormulaLineDetail[]
  project: FormulaProjectInfo | null
}

export async function createFormula(payload: CreateFormulaPayload): Promise<FormulaDetail> {
  const res = await apiFetch(`${API_URL}/api/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to save formula (${res.status})`)
  return res.json()
}

export async function updateFormula(
  id: string,
  payload: CreateFormulaPayload,
): Promise<FormulaDetail> {
  const res = await apiFetch(`${API_URL}/api/formulas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to update formula (${res.status})`)
  }
  return res.json()
}

export async function listFormulas(): Promise<FormulaSummary[]> {
  const res = await apiFetch(`${API_URL}/api/formulas`)
  if (!res.ok) throw new Error(`Failed to load formulas (${res.status})`)
  return res.json()
}

export async function getFormula(id: string): Promise<FormulaDetail> {
  const res = await apiFetch(`${API_URL}/api/formulas/${id}`)
  if (!res.ok) throw new Error(`Failed to load formula (${res.status})`)
  return res.json()
}

export async function finalizeFormula(id: string) {
  const res = await apiFetch(`${API_URL}/api/formulas/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  })
  if (!res.ok) throw new Error(`Failed to finalize formula (${res.status})`)
  return res.json()
}

export async function deleteFormula(id: string) {
  const res = await apiFetch(`${API_URL}/api/formulas/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete formula (${res.status})`)
}

export async function convertFormulaToMaterial(id: string) {
  const res = await apiFetch(`${API_URL}/api/formulas/${id}/convert-to-material`, {
    method: 'POST',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to convert formula (${res.status})`)
  }
  return res.json()
}

export interface FormulaLineage<T> {
  /** Dernière version (numéro le plus élevé). */
  latest: T
  /** Versions précédentes, de la plus récente à la plus ancienne. */
  older: T[]
}

/** Regroupe les versions d'une même formule (même racine) ; l'ordre des lignées suit la liste reçue. */
export function groupVersions<T extends { id: string; version: number; rootFormulaId: string | null }>(
  formulas: T[],
): FormulaLineage<T>[] {
  const byRoot = new Map<string, T[]>()
  for (const f of formulas) {
    const root = f.rootFormulaId ?? f.id
    const list = byRoot.get(root)
    if (list) list.push(f)
    else byRoot.set(root, [f])
  }
  return [...byRoot.values()].map((versions) => {
    const [latest, ...older] = [...versions].sort((a, b) => b.version - a.version)
    return { latest, older }
  })
}

/** Nombre de formules distinctes (lignées), pour les compteurs. */
export function countLineages(formulas: { id: string; rootFormulaId: string | null }[]): number {
  return new Set(formulas.map((f) => f.rootFormulaId ?? f.id)).size
}

/** Identifiant à afficher pour une version (repli sur vN pour une formule sans code). */
export function versionLabel(f: { code?: string | null; version: number }): string {
  return f.code ?? `v${f.version}`
}
