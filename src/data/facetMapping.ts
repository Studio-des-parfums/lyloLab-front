export const FACETS = [
  'Acidulé',
  'Sec',
  'Aldéhydé',
  'Fraicheur',
  'Vert',
  'Camphré',
  'Aromatique',
  'Epicé',
  'Résineux',
  'Musqué',
  'Ambré',
  'Poudré',
  'Chypré',
  'Gras',
  'Animalisé',
  'Boisé',
  'Terreux',
  'Balsamique',
  'Fumé',
  'Marin',
  'Floral',
  'Gourmand',
  'Lacté',
  'Fruité',
] as const

export type Facet = (typeof FACETS)[number]

/**
 * Each raw descriptor from the materials catalog is now its own facet
 * (1:1), so this is a straight passthrough/normalization rather than an
 * aggregation across several descriptors.
 */
export function descriptorsToFacets(
  descriptors: Record<string, number>,
): Record<Facet, number> {
  const result = {} as Record<Facet, number>
  for (const facet of FACETS) {
    result[facet] = descriptors[facet] ?? 0
  }
  return result
}
