import type { MaterialShare } from './formulaEngine'
import { parseIfraLimitPercent } from './ifraLimit'

export type ComplianceLevel = 'ok' | 'warning' | 'violation'

export interface MaterialCompliance {
  share: MaterialShare
  level: ComplianceLevel
  limitPercent: number | null
  isAllergen: boolean
  allergens: string[]
  isBanned: boolean
  messages: string[]
}

export interface FormulaCompliance {
  materials: MaterialCompliance[]
  cappedCount: number
  bannedCount: number
  allergenCount: number
  /** EU allergens found in 2+ materials of this formula — a real, name-level cumulative-exposure risk. */
  overlappingAllergens: string[]
}

export { parseIfraLimitPercent }

/**
 * Reads the compliance outcome already enforced by `computeFormulaShares`
 * (which caps each material's dosage at its IFRA Cat.4 limit before it ever
 * reaches this table) and surfaces it for display: which materials were
 * capped, which are banned outright, and which allergens they declare.
 * Cumulative-exposure risk is computed from the structured `allergens` list
 * on each material: any allergen shared by 2+ materials in the formula.
 */
export function evaluateFormulaCompliance(shares: MaterialShare[]): FormulaCompliance {
  const allergenOccurrences = new Map<string, number>()
  for (const share of shares) {
    for (const allergen of share.material.regulatory?.allergens ?? []) {
      allergenOccurrences.set(allergen, (allergenOccurrences.get(allergen) ?? 0) + 1)
    }
  }
  const materials: MaterialCompliance[] = shares.map((share) => {
    const regulatory = share.material.regulatory
    const limitPercent = share.ifraLimitPercent
    const allergen = regulatory?.isAllergen ?? false
    const allergens = regulatory?.allergens ?? []
    const banned = limitPercent === 0

    const messages: string[] = []
    let level: ComplianceLevel = 'ok'

    if (banned) {
      level = 'violation'
      messages.push('Interdite en Cat.4 — exclue automatiquement de la formule.')
    } else if (share.cappedByIfra) {
      level = 'warning'
      messages.push(
        `Dosage plafonné à ${limitPercent}% pour respecter la limite IFRA Cat.4.`,
      )
    }

    if (allergen) {
      if (level === 'ok') level = 'warning'
      messages.push(
        allergens.length > 0
          ? `Allergène UE déclarable : ${allergens.join(', ')}.`
          : 'Allergène UE déclarable.',
      )
    }

    const shared = allergens.filter((a) => (allergenOccurrences.get(a) ?? 0) >= 2)
    if (shared.length > 0) {
      if (level === 'ok') level = 'warning'
      messages.push(`Cumul avec d'autres matières de la formule : ${shared.join(', ')}.`)
    }

    return {
      share,
      level,
      limitPercent,
      isAllergen: allergen,
      allergens,
      isBanned: banned,
      messages,
    }
  })

  return {
    materials,
    cappedCount: materials.filter((m) => m.share.cappedByIfra).length,
    bannedCount: materials.filter((m) => m.isBanned).length,
    allergenCount: materials.filter((m) => m.isAllergen).length,
    overlappingAllergens: [...allergenOccurrences]
      .filter(([, count]) => count >= 2)
      .map(([allergen]) => allergen),
  }
}
