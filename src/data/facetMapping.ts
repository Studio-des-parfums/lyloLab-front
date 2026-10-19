export const FACETS = [
  'Fraîcheur',
  'Floralité',
  'Fruité',
  'Gourmande',
  'Boisé',
  'Ambré',
  'Épicé',
] as const

export type Facet = (typeof FACETS)[number]

export const FACET_DESCRIPTORS: Record<Facet, string[]> = {
  Fraîcheur: ['Fraicheur', 'Aldéhydé', 'Marin', 'Vert'],
  Floralité: ['Floral'],
  Fruité: ['Fruité'],
  Gourmande: ['Gourmand', 'Lacté', 'Poudré'],
  Boisé: ['Boisé', 'Terreux', 'Chypré'],
  Ambré: ['Ambré', 'Balsamique', 'Résineux', 'Animalisé'],
  Épicé: ['Epicé', 'Aromatique', 'Camphré'],
}

export function descriptorsToFacets(
  descriptors: Record<string, number>,
): Record<Facet, number> {
  const result = {} as Record<Facet, number>
  for (const facet of FACETS) {
    const keys = FACET_DESCRIPTORS[facet]
    const sum = keys.reduce((acc, key) => acc + (descriptors[key] ?? 0), 0)
    result[facet] = sum / keys.length
  }
  return result
}
