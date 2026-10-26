import { API_URL, apiFetch } from './api'

/** A change proposed by the formulation assistant (see backend/src/ai/formula-changes.ts). */
export type FormulaChange =
  | { type: 'set_facet'; facet: string; value: number }
  | { type: 'set_adjustment'; adjustment: string; value: number }
  | { type: 'add_material'; materialId: string; material: string }
  | { type: 'remove_material'; materialId: string; material: string }
  | {
      type: 'set_percentages'
      items: { materialId: string; material: string; percent: number }[]
    }
  | { type: 'reset_auto_distribution' }
  | { type: 'rename_formula'; name: string }
  | { type: 'set_total_volume'; ml: number }

export interface FormulaProposal {
  summary: string
  changes: FormulaChange[]
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant'
  content: string
}

export interface FormulaSnapshot {
  name: string
  totalVolumeMl: number
  facets: Record<string, number>
  adjustments: Record<string, number>
  manualDistribution: boolean
  lines: {
    material: string
    percent: number
    ml: number
    ifraLimitPercent: number | null
    cappedByIfra: boolean
  }[]
  overlappingAllergens: string[]
}

export interface ChatSource {
  title: string
  url: string
}

export interface ChatResponse {
  message: string
  proposal: FormulaProposal | null
  warnings: string[]
  sources: ChatSource[]
}

export async function sendChat(
  messages: ChatMessagePayload[],
  formula: FormulaSnapshot,
): Promise<ChatResponse> {
  const res = await apiFetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, formula }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `L'assistant IA n'a pas répondu (${res.status})`)
  }
  return res.json()
}

export function describeChange(change: FormulaChange): string {
  switch (change.type) {
    case 'set_facet':
      return `Facette ${change.facet} → ${change.value}`
    case 'set_adjustment':
      return `${change.adjustment} → ${change.value}%`
    case 'add_material':
      return `Ajouter ${change.material}`
    case 'remove_material':
      return `Retirer ${change.material}`
    case 'set_percentages':
      return `Répartition : ${change.items
        .map((item) => `${item.material} ${Number(item.percent.toFixed(2))}%`)
        .join(', ')}`
    case 'reset_auto_distribution':
      return 'Revenir à la répartition automatique'
    case 'rename_formula':
      return `Renommer en « ${change.name} »`
    case 'set_total_volume':
      return `Volume total → ${change.ml} ml`
  }
}
