export interface MaterialRegulatory {
  ifraLimit?: string
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
  regulatory: MaterialRegulatory | null
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function fetchMaterials(): Promise<Material[]> {
  const res = await fetch(`${API_URL}/api/materials`)
  if (!res.ok) throw new Error(`Failed to fetch materials (${res.status})`)
  return res.json()
}
