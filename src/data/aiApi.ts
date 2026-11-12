import { API_URL, apiFetch, readErrorMessage } from './api'

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

export interface StreamHandlers {
  onDelta: (text: string) => void
  onStatus?: (status: 'search' | 'catalog') => void
  signal?: AbortSignal
}

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'status'; status: 'search' | 'catalog' }
  | ({ type: 'done' } & ChatResponse)
  | { type: 'error'; message: string }

/** Like sendChat, but the message text arrives token by token through onDelta. */
export async function streamChat(
  messages: ChatMessagePayload[],
  formula: FormulaSnapshot,
  { onDelta, onStatus, signal }: StreamHandlers,
): Promise<ChatResponse> {
  const res = await apiFetch(`${API_URL}/api/ai/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ messages, formula }),
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(await readErrorMessage(res, "L'assistant IA n'a pas répondu"))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const data = raw
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (!data) continue
      const event = JSON.parse(data) as StreamEvent
      if (event.type === 'delta') onDelta(event.text)
      else if (event.type === 'status') onStatus?.(event.status)
      else if (event.type === 'error') throw new Error(event.message)
      else {
        const { type: _type, ...response } = event
        return response
      }
    }
  }
  throw new Error("La réponse de l'assistant IA a été interrompue, réessayez.")
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

/** Speech-to-text for the assistant's voice input. */
export async function transcribeAudio(audio: Blob, signal?: AbortSignal): Promise<string> {
  const form = new FormData()
  form.append('audio', audio, 'voice')
  const res = await apiFetch(`${API_URL}/api/ai/transcribe`, { method: 'POST', body: form, signal })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'La transcription a échoué'))
  const body: { text: string } = await res.json()
  return body.text
}
