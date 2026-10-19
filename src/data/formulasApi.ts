export interface CreateFormulaLinePayload {
  materialId: string
  quantity: number
}

export interface CreateFormulaPayload {
  name: string
  facets: Record<string, number>
  adjustments: Record<string, number>
  lines: CreateFormulaLinePayload[]
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
