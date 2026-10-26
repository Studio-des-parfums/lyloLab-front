import { FACETS, descriptorsToFacets, type Facet } from './facetMapping'
import {
  ADJUSTMENT_DESCRIPTORS,
  type AdjustmentKey,
} from './adjustmentMapping'
import type { Material } from './materials'
import { parseIfraLimitPercent } from './ifraLimit'

const DESCRIPTOR_MAX = 9

export interface MaterialShare {
  material: Material
  percent: number
  /** True when this share was reduced below its natural weight to respect the material's IFRA Cat.4 limit. */
  cappedByIfra: boolean
  ifraLimitPercent: number | null
}

/**
 * Affinity = how closely a material's facet profile matches the user's
 * facet sliders (dot product of normalized vectors). Materials closer to
 * the desired profile get a bigger share of the formula.
 */
function affinityScore(
  materialFacets: Record<Facet, number>,
  userFacets: Record<Facet, number>,
): number {
  let score = 0
  for (const facet of FACETS) {
    const materialValue = materialFacets[facet] / DESCRIPTOR_MAX // 0..1
    const userValue = userFacets[facet] / 100 // 0..1
    score += materialValue * userValue
  }
  return score
}

function averageOf(descriptors: Record<string, number>, keys: string[]): number {
  if (keys.length === 0) return 0
  const sum = keys.reduce((acc, key) => acc + (descriptors[key] ?? 0), 0)
  return sum / keys.length / DESCRIPTOR_MAX // normalized 0..1
}

// Catalog-wide average descriptor profile, used as the baseline for
// "Originalité": a material whose profile deviates a lot from this
// average is considered more original/atypical.
function computeCatalogAverage(
  catalog: Material[],
  descriptorKeys: string[],
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const key of descriptorKeys) totals[key] = 0
  for (const material of catalog) {
    for (const key of descriptorKeys) {
      totals[key] += material.descriptors[key] ?? 0
    }
  }
  for (const key of descriptorKeys) totals[key] /= catalog.length || 1
  return totals
}

function originalityOf(
  descriptors: Record<string, number>,
  descriptorKeys: string[],
  catalogAverage: Record<string, number>,
): number {
  if (descriptorKeys.length === 0) return 0
  const squaredDiffs = descriptorKeys.map((key) => {
    const diff = (descriptors[key] ?? 0) - catalogAverage[key]
    return diff * diff
  })
  const variance =
    squaredDiffs.reduce((acc, v) => acc + v, 0) / descriptorKeys.length
  const stdDev = Math.sqrt(variance)
  // normalize: empirically stdDev rarely exceeds ~3 on a 0-9 scale
  return Math.min(stdDev / 3, 1)
}

/**
 * Converts each adjustment slider (0-100, 50 = neutral) into a multiplier
 * applied to the affinity score, based on how strongly the material scores
 * on that adjustment's descriptor group.
 */
function adjustmentMultiplier(
  material: Material,
  adjustments: Record<AdjustmentKey, number>,
  allDescriptors: string[],
  catalogAverage: Record<string, number>,
): number {
  let multiplier = 1

  for (const [key, descriptorKeys] of Object.entries(ADJUSTMENT_DESCRIPTORS)) {
    const adjustmentKey = key as AdjustmentKey
    const sliderValue = adjustments[adjustmentKey]
    if (sliderValue === undefined || !descriptorKeys) continue

    const intensity = averageOf(material.descriptors, descriptorKeys) // 0..1
    const pull = (sliderValue - 50) / 50 // -1..1
    multiplier *= 1 + pull * intensity
  }

  // Puissance: proxy = average across every descriptor (overall intensity)
  const puissanceSlider = adjustments.Puissance
  if (puissanceSlider !== undefined) {
    const intensity = averageOf(material.descriptors, allDescriptors)
    const pull = (puissanceSlider - 50) / 50
    multiplier *= 1 + pull * intensity
  }

  // Originalité: proxy = deviation from the catalog average profile
  const originaliteSlider = adjustments.Originalité
  if (originaliteSlider !== undefined) {
    const intensity = originalityOf(
      material.descriptors,
      allDescriptors,
      catalogAverage,
    )
    const pull = (originaliteSlider - 50) / 50
    multiplier *= 1 + pull * intensity
  }

  return Math.max(multiplier, 0.1)
}

/**
 * Distributes `pool` percentage points across items proportionally to their
 * weight, except that no item may exceed its own `cap` (IFRA Cat.4 limit).
 * Items that would exceed their cap are pinned at the cap and removed from
 * the pool; the remaining pool is re-distributed among the rest. Repeats
 * until stable (classic "water-filling" allocation).
 */
export function allocateWithCaps(
  weights: number[],
  caps: (number | null)[],
  pool: number,
): { shares: number[]; capped: boolean[] } {
  const shares = new Array(weights.length).fill(0)
  const capped = new Array(weights.length).fill(false)
  const active = weights.map((_, i) => i).filter((i) => weights[i] > 0)

  let remainingPool = pool

  for (let guard = 0; guard < weights.length + 1 && active.length > 0; guard++) {
    const activeWeightSum = active.reduce((sum, i) => sum + weights[i], 0)
    if (activeWeightSum <= 0) break

    let anyNewlyCapped = false

    for (const i of active) {
      const tentative = (remainingPool * weights[i]) / activeWeightSum
      const cap = caps[i]
      if (cap !== null && tentative > cap) {
        shares[i] = cap
        capped[i] = true
        remainingPool -= cap
        anyNewlyCapped = true
      }
    }

    if (anyNewlyCapped) {
      for (let i = active.length - 1; i >= 0; i--) {
        if (capped[active[i]]) active.splice(i, 1)
      }
      continue
    }

    // No material exceeds its cap at this distribution: finalize.
    for (const i of active) {
      shares[i] = (remainingPool * weights[i]) / activeWeightSum
    }
    break
  }

  return { shares, capped }
}

export function computeFormulaShares(
  favorites: Material[],
  userFacets: Record<Facet, number>,
  adjustments: Record<AdjustmentKey, number>,
  catalog: Material[],
): MaterialShare[] {
  if (favorites.length === 0) return []

  // Inventory-only materials have no olfactory profile yet; keep them out of
  // the baseline so they don't drag the average toward zero.
  const profiled = catalog.filter((m) => Object.keys(m.descriptors).length > 0)
  const allDescriptors = Object.keys(profiled[0]?.descriptors ?? {})
  const catalogAverage = computeCatalogAverage(profiled, allDescriptors)

  const weights = favorites.map((material) => {
    const materialFacets = descriptorsToFacets(material.descriptors)
    const baseScore = affinityScore(materialFacets, userFacets)
    const multiplier = adjustmentMultiplier(
      material,
      adjustments,
      allDescriptors,
      catalogAverage,
    )
    // floor so a material with zero affinity still gets a minimal share
    return Math.max(baseScore * multiplier, 0.02)
  })

  const limits = favorites.map((material) =>
    parseIfraLimitPercent(material.regulatory?.ifraLimit),
  )

  const { shares, capped } = allocateWithCaps(weights, limits, 100)

  return favorites.map((material, i) => ({
    material,
    percent: shares[i],
    cappedByIfra: capped[i],
    ifraLimitPercent: limits[i],
  }))
}

/**
 * Overrides the engine's computed shares with the user's manual ml
 * quantities, when the formula is in manual distribution mode.
 */
export function applyManualMl(
  computedShares: MaterialShare[],
  manualMl: Record<string, number> | null,
  totalVolumeMl: number,
): MaterialShare[] {
  if (!manualMl) return computedShares
  return computedShares.map((share) => {
    const percent =
      totalVolumeMl > 0
        ? ((manualMl[share.material.id] ?? 0) / totalVolumeMl) * 100
        : 0
    return {
      ...share,
      percent,
      cappedByIfra:
        share.ifraLimitPercent !== null &&
        percent >= share.ifraLimitPercent - 1e-9,
    }
  })
}

export function averageFacetsFromMaterials(
  materials: Material[],
): Record<Facet, number> {
  const base = Object.fromEntries(FACETS.map((f) => [f, 0])) as Record<
    Facet,
    number
  >
  if (materials.length === 0) {
    for (const facet of FACETS) base[facet] = 50
    return base
  }

  for (const material of materials) {
    const facets = descriptorsToFacets(material.descriptors)
    for (const facet of FACETS) {
      base[facet] += (facets[facet] / DESCRIPTOR_MAX) * 100
    }
  }
  for (const facet of FACETS) {
    base[facet] = Math.round(base[facet] / materials.length)
  }
  return base
}
