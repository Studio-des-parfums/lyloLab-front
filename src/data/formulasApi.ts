export interface CreateFormulaLinePayload {
  materialId: string
  quantity: number
}

export type FormulaStatus = 'draft' | 'completed'

export interface CreateFormulaPayload {
  name: string
  facets: Record<string, number>
  adjustments: Record<string, number>
  lines: CreateFormulaLinePayload[]
  status?: FormulaStatus
}

export interface FormulaSummary {
  id: string
  name: string
  status: FormulaStatus
  createdAt: string
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

export interface FormulaDetail {
  id: string
  name: string
  status: FormulaStatus
  facets: Record<string, number>
  adjustments: Record<string, number>
  createdAt: string
  lines: FormulaLineDetail[]
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function createFormula(payload: CreateFormulaPayload) {
  const res = await fetch(`${API_URL}/api/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to save formula (${res.status})`)
  return res.json()
}

export async function updateFormula(id: string, payload: CreateFormulaPayload) {
  const res = await fetch(`${API_URL}/api/formulas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to update formula (${res.status})`)
  return res.json()
}

export async function listFormulas(): Promise<FormulaSummary[]> {
  const res = await fetch(`${API_URL}/api/formulas`)
  if (!res.ok) throw new Error(`Failed to load formulas (${res.status})`)
  return res.json()
}

export async function getFormula(id: string): Promise<FormulaDetail> {
  const res = await fetch(`${API_URL}/api/formulas/${id}`)
  if (!res.ok) throw new Error(`Failed to load formula (${res.status})`)
  return res.json()
}

export async function finalizeFormula(id: string) {
  const res = await fetch(`${API_URL}/api/formulas/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  })
  if (!res.ok) throw new Error(`Failed to finalize formula (${res.status})`)
  return res.json()
}

export async function deleteFormula(id: string) {
  const res = await fetch(`${API_URL}/api/formulas/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete formula (${res.status})`)
}
