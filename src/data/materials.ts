export interface MaterialRegulatory {
  /** Free text ("0.17 % Cat.4") or, for Excel percentage cells, a fraction (0.02 = 2 %). */
  ifraLimit?: string | number
  rciiiRestriction?: string
  ifraReason?: string
  /** True when this material carries at least one EU-declarable fragrance allergen. */
  isAllergen?: boolean
  /** Canonical EU allergen names found in this material (e.g. "Limonene", "Linalool"). */
  allergens?: string[]
  /** Original free-text EU allergen cell from the source regulatory sheet, kept for reference. */
  euAllergenRaw?: string
  recombi?: string
  physicoChemicalIssue?: string
  triggeringConditions?: string
  impactResult?: string
  usaMocra?: string
  californiaProp65?: string
  chinaCsar?: string
  chinaMeaning?: string
  menaGso?: string
}

export type MaterialOrigin = 'natural' | 'synthetic'

/** One bottle/lot of the material in the lab inventory (Rangement frigo MP). */
export interface MaterialStock {
  id: number
  /** Name as written in the inventory file (may differ from the material name). */
  label: string
  supplier: string | null
  /** Manufacturer when bought through a distributor (e.g. Givaudan via Bulkaroma). */
  producer: string | null
  location: string | null
  stockGrams: number | null
  /** Non-numeric stock value from the file (e.g. "Vide", "2*500g"). */
  stockNote: string | null
}

export interface Material {
  id: string
  casNumber: string | null
  name: string
  family: string | null
  sensation: string | null
  weight: number | null
  subjectivePower: number | null
  descriptors: Record<string, number>
  source: string
  origin: MaterialOrigin
  regulatory: MaterialRegulatory | null
  sourceFormulaId?: string | null
  /** Chemical nature from the lab inventory; `origin` only tells catalog vs formula-derived. */
  nature: MaterialOrigin | null
  ifraCat4: string | null
  cosmeticRegulation: string | null
  allergens: string | null
  flavor: string | null
  flavorRestriction: string | null
  // Technical sheet, filled in by hand.
  adjacentNote: string | null
  regulation: string | null
  freeNote: string | null
  visualAspect: string | null
  flashPoint: string | null
  physicochemicalState: string | null
  waterBase: boolean | null
  stocks: MaterialStock[]
}

/** Natural/synthetic as shown to the user: formula-derived materials are always synthetic. */
export function materialNature(material: Material): MaterialOrigin {
  if (material.origin === 'synthetic') return 'synthetic'
  return material.nature ?? 'natural'
}

export function totalStockGrams(material: Material): number | null {
  const amounts = material.stocks
    .map((s) => s.stockGrams)
    .filter((g): g is number => g !== null)
  return amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) : null
}

export function formatGrams(grams: number): string {
  return `${grams.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} g`
}

/** Distinct non-empty values, compared case-insensitively, in first-seen order. */
export function distinctValues(values: (string | null)[]): string[] {
  const seen = new Map<string, string>()
  for (const value of values) {
    const key = value?.trim().toLowerCase()
    if (key && !seen.has(key)) seen.set(key, value!.trim())
  }
  return [...seen.values()]
}

export interface MaterialRecipeLine {
  quantity: number
  material: Material
}

export interface MaterialDetail extends Material {
  sourceFormula: {
    id: string
    name: string
    lines: MaterialRecipeLine[]
  } | null
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function fetchMaterials(): Promise<Material[]> {
  const res = await fetch(`${API_URL}/api/materials`)
  if (!res.ok) throw new Error(`Failed to fetch materials (${res.status})`)
  return res.json()
}

export async function fetchMaterial(id: string): Promise<MaterialDetail> {
  const res = await fetch(`${API_URL}/api/materials/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch material (${res.status})`)
  return res.json()
}

export interface UpdateMaterialPayload {
  name?: string
  casNumber?: string | null
  family?: string | null
  sensation?: string | null
  weight?: number | null
  subjectivePower?: number | null
  descriptors?: Record<string, number>
  origin?: MaterialOrigin
  nature?: MaterialOrigin | null
  ifraCat4?: string | null
  cosmeticRegulation?: string | null
  allergens?: string | null
  flavor?: string | null
  flavorRestriction?: string | null
  adjacentNote?: string | null
  regulation?: string | null
  freeNote?: string | null
  visualAspect?: string | null
  flashPoint?: string | null
  physicochemicalState?: string | null
  waterBase?: boolean | null
  regulatory?: MaterialRegulatory | null
}

export interface MaterialStockPayload {
  supplier?: string | null
  producer?: string | null
  location?: string | null
  stockGrams?: number | null
  stockNote?: string | null
}

export interface CreateMaterialStockPayload extends MaterialStockPayload {
  label: string
}

export interface UpdateMaterialStockPayload extends MaterialStockPayload {
  label?: string
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  return body?.message ?? `${fallback} (${res.status})`
}

export async function updateMaterial(
  id: string,
  payload: UpdateMaterialPayload,
): Promise<Material> {
  const res = await fetch(`${API_URL}/api/materials/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to update material'))
  return res.json()
}

export async function createMaterialStock(
  materialId: string,
  payload: CreateMaterialStockPayload,
): Promise<Material> {
  const res = await fetch(`${API_URL}/api/materials/${materialId}/stocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to create stock'))
  return res.json()
}

export async function updateMaterialStock(
  materialId: string,
  stockId: number,
  payload: UpdateMaterialStockPayload,
): Promise<Material> {
  const res = await fetch(`${API_URL}/api/materials/${materialId}/stocks/${stockId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to update stock'))
  return res.json()
}

export async function deleteMaterialStock(
  materialId: string,
  stockId: number,
): Promise<Material> {
  const res = await fetch(`${API_URL}/api/materials/${materialId}/stocks/${stockId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to delete stock'))
  return res.json()
}
