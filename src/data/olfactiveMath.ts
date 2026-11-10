import { FACETS } from './facetMapping'
import { parseIfraLimitPercent } from './ifraLimit'
import { totalStockGrams, type Material } from './materials'

export type FacetVector = number[]

/** The 24 facet scores of a material, in FACETS order. */
export const vectorOf = (m: Pick<Material, 'descriptors'>): FacetVector =>
  FACETS.map((f) => Number(m.descriptors?.[f]) || 0)

const norm = (v: FacetVector) => Math.sqrt(v.reduce((s, x) => s + x * x, 0))

/** Cosine similarity between two facet profiles (0 = unrelated, 1 = same shape). */
export function similarity(a: FacetVector, b: FacetVector): number {
  const na = norm(a)
  const nb = norm(b)
  if (na === 0 || nb === 0) return 0
  return a.reduce((s, x, i) => s + x * b[i], 0) / (na * nb)
}

export const hasProfile = (m: Pick<Material, 'descriptors'>) => vectorOf(m).some((x) => x > 0)

/** Facets sorted by score, highest first. */
export function topFacets(m: Pick<Material, 'descriptors'>, count = 3): [string, number][] {
  return FACETS.map((f) => [f, Number(m.descriptors?.[f]) || 0] as [string, number])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
}

export const dominantFacet = (m: Pick<Material, 'descriptors'>) => topFacets(m, 1)[0]?.[0] ?? null

/** Angle of each facet on the olfactive wheel (FACETS order, clockwise from the top). */
export const facetAngle = (index: number) => (index / FACETS.length) * Math.PI * 2 - Math.PI / 2

/**
 * Position of a material on the wheel: barycentre of its facets placed on the
 * circle, weighted by score (squared to favour the dominant ones). A material
 * with one clear facet lands near the rim, a balanced one near the centre.
 */
export function wheelPosition(v: FacetVector): { x: number; y: number } {
  let x = 0
  let y = 0
  let total = 0
  v.forEach((value, i) => {
    const w = value * value
    x += Math.cos(facetAngle(i)) * w
    y += Math.sin(facetAngle(i)) * w
    total += w
  })
  return total === 0 ? { x: 0, y: 0 } : { x: x / total, y: y / total }
}

/** Banned by IFRA Cat.4 or by Annex II of the EU Cosmetics Regulation. */
export function isBanned(m: Material): boolean {
  return (
    parseIfraLimitPercent(m.regulatory?.ifraLimit) === 0 ||
    (m.regulatory?.rciiiRestriction ?? '').startsWith('Annexe II')
  )
}

export const inStock = (m: Material) => (totalStockGrams(m) ?? 0) > 0

export interface Neighbour {
  material: Material
  score: number
}

/** Materials closest to `target`, best first. */
export function neighbours(
  target: Material,
  catalog: Material[],
  filter: (m: Material) => boolean = () => true,
  count = 12,
): Neighbour[] {
  const v = vectorOf(target)
  return catalog
    .filter((m) => m.id !== target.id && hasProfile(m) && filter(m))
    .map((m) => ({ material: m, score: similarity(v, vectorOf(m)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}

/** Similarity of a material to a set of facets (e.g. a family's indicative profile). */
export function matchFacets(m: Material, facets: string[]): number {
  if (facets.length === 0) return 0
  const target = FACETS.map((f) => (facets.includes(f) ? 1 : 0))
  return similarity(vectorOf(m), target)
}
