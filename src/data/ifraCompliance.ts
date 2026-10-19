import type { MaterialShare } from './formulaEngine'
import { parseIfraLimitPercent } from './ifraLimit'

export type ComplianceLevel = 'ok' | 'warning' | 'violation'

export interface MaterialCompliance {
  share: MaterialShare
  level: ComplianceLevel
  limitPercent: number | null
  isAllergen: boolean
  hasRecombiRisk: boolean
  isBanned: boolean
  messages: string[]
}

export interface FormulaCompliance {
  materials: MaterialCompliance[]
  cappedCount: number
  bannedCount: number
  allergenCount: number
  recombiRisk: boolean
}

export { parseIfraLimitPercent }

function isDeclaredAllergen(euAllergen?: string): boolean {
  if (!euAllergen) return false
  const normalized = euAllergen.trim().toLowerCase()
  return !(normalized === 'no' || normalized.startsWith('non'))
}

function hasRecombiRisk(recombi?: string): boolean {
  if (!recombi) return false
  return recombi.trim().toLowerCase() !== 'no'
}

/**
 * Reads the compliance outcome already enforced by `computeFormulaShares`
 * (which caps each material's dosage at its IFRA Cat.4 limit before it ever
 * reaches this table) and surfaces it for display: which materials were
 * capped, which are banned outright, and which carry an allergen /
 * cumulative-risk (Recombi) note.
 */
export function evaluateFormulaCompliance(shares: MaterialShare[]): FormulaCompliance {
  const materials: MaterialCompliance[] = shares.map((share) => {
    const regulatory = share.material.regulatory
    const limitPercent = share.ifraLimitPercent
    const allergen = isDeclaredAllergen(regulatory?.euAllergen)
    const recombi = hasRecombiRisk(regulatory?.recombi)
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
      messages.push('Allergène UE déclarable.')
    }

    if (recombi) {
      if (level === 'ok') level = 'warning'
      messages.push('Risque de cumul avec d’autres matières (Recombi).')
    }

    return {
      share,
      level,
      limitPercent,
      isAllergen: allergen,
      hasRecombiRisk: recombi,
      isBanned: banned,
      messages,
    }
  })

  return {
    materials,
    cappedCount: materials.filter((m) => m.share.cappedByIfra).length,
    bannedCount: materials.filter((m) => m.isBanned).length,
    allergenCount: materials.filter((m) => m.isAllergen).length,
    // A real cumulative-dose calculation needs per-constituent breakdown (not
    // available here); as a conservative proxy, flag when several materials
    // each carry their own Recombi risk note.
    recombiRisk: materials.filter((m) => m.hasRecombiRisk).length >= 2,
  }
}
