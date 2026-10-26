import { FACETS, descriptorsToFacets, type Facet } from './facetMapping'
import {
  ADJUSTMENTS,
  ADJUSTMENT_DESCRIPTORS,
  type AdjustmentKey,
} from './adjustmentMapping'
import type { Material } from './materials'
import { averageFacetsFromMaterials } from './formulaEngine'

/**
 * Links between the three views of a formula: the 24 facets (the radar),
 * the 5 quick adjustments and the indicative formula (material shares).
 *
 * - Adjustments are read from the facets: Diffusion, Tenue and Douceur are
 *   the average of their facet group, Puissance the average of all facets,
 *   Originalité how far the facet *shape* departs from the catalog average.
 * - Moving an adjustment rewrites the facets so that the reading matches.
 * - A manual distribution gives the facets of the actual blend
 *   (percent-weighted average of the materials' descriptors).
 */

const DESCRIPTOR_MAX = 9
// Shape deviation (on the 0-100 facet scale) at which Originalité reads 100.
const ORIGINALITY_FULL_SCALE = 35

type Facets = Record<Facet, number>

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max)
const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length

function groupOf(key: AdjustmentKey): readonly Facet[] {
  return (ADJUSTMENT_DESCRIPTORS[key] as Facet[] | undefined) ?? FACETS
}

/** Facet profile with its overall level removed, so only the shape remains. */
function shapeOf(facets: Facets): Facets {
  const level = mean(FACETS.map((f) => facets[f]))
  return Object.fromEntries(FACETS.map((f) => [f, facets[f] - level])) as Facets
}

function shapeDeviation(facets: Facets, baseline: Facets): number {
  const shape = shapeOf(facets)
  const baselineShape = shapeOf(baseline)
  return Math.sqrt(mean(FACETS.map((f) => (shape[f] - baselineShape[f]) ** 2)))
}

/** Average facet profile of the profiled catalog: the reference for Originalité. */
export function catalogAverageFacets(catalog: Material[]): Facets {
  return averageFacetsFromMaterials(
    catalog.filter((m) => Object.keys(m.descriptors).length > 0),
  )
}

export function adjustmentsFromFacets(
  facets: Facets,
  baseline: Facets,
): Record<AdjustmentKey, number> {
  return Object.fromEntries(
    ADJUSTMENTS.map((key) => {
      const value =
        key === 'Originalité'
          ? (shapeDeviation(facets, baseline) / ORIGINALITY_FULL_SCALE) * 100
          : mean(groupOf(key).map((f) => facets[f]))
      return [key, Math.round(clamp(value))]
    }),
  ) as Record<AdjustmentKey, number>
}

/** Facets rewritten so that `key` reads `target` (as closely as the 0-100 bounds allow). */
export function facetsForAdjustment(
  facets: Facets,
  key: AdjustmentKey,
  target: number,
  baseline: Facets,
): Facets {
  if (key === 'Originalité') {
    const deviation = shapeDeviation(facets, baseline)
    if (deviation < 1e-6) return facets
    // Scale the shape away from (or toward) the catalog's, keeping the overall level.
    const factor = ((target / 100) * ORIGINALITY_FULL_SCALE) / deviation
    const level = mean(FACETS.map((f) => facets[f]))
    const shape = shapeOf(facets)
    const baselineShape = shapeOf(baseline)
    return Object.fromEntries(
      FACETS.map((f) => [
        f,
        Math.round(
          clamp(level + baselineShape[f] + (shape[f] - baselineShape[f]) * factor),
        ),
      ]),
    ) as Facets
  }

  // Shift the group's facets by the gap; facets pinned at 0/100 hand their
  // share of the shift to the others.
  const group = groupOf(key)
  const next = { ...facets }
  for (let pass = 0; pass < 5; pass++) {
    const gap = target - mean(group.map((f) => next[f]))
    if (Math.abs(gap) < 0.5) break
    const movable = group.filter((f) => (gap > 0 ? next[f] < 100 : next[f] > 0))
    if (movable.length === 0) break
    const step = (gap * group.length) / movable.length
    for (const f of movable) next[f] = clamp(next[f] + step)
  }
  for (const f of group) next[f] = Math.round(next[f])
  return next
}

/** Facet profile of an actual blend, or null when it has no material. */
export function facetsFromShares(
  shares: { material: Material; percent: number }[],
): Facets | null {
  const total = shares.reduce((sum, s) => sum + s.percent, 0)
  if (total <= 0) return null
  const result = Object.fromEntries(FACETS.map((f) => [f, 0])) as Facets
  for (const { material, percent } of shares) {
    const materialFacets = descriptorsToFacets(material.descriptors)
    for (const f of FACETS) {
      result[f] += (percent / total) * (materialFacets[f] / DESCRIPTOR_MAX) * 100
    }
  }
  for (const f of FACETS) result[f] = Math.round(result[f])
  return result
}
