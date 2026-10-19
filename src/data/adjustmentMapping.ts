export const ADJUSTMENTS = [
  'Diffusion / Sillage',
  'Tenue',
  'Puissance',
  'Douceur',
  'Originalité',
] as const

export type AdjustmentKey = (typeof ADJUSTMENTS)[number]

/** Descriptor groups used as a proxy for each adjustment slider.
 * "Puissance" uses every descriptor (overall intensity of the profile).
 * "Originalité" has no fixed group — it's derived from how much a
 * material's profile deviates from the catalog average (see formulaEngine).
 */
export const ADJUSTMENT_DESCRIPTORS: Partial<Record<AdjustmentKey, string[]>> = {
  'Diffusion / Sillage': ['Fraicheur', 'Aldéhydé', 'Marin', 'Vert', 'Acidulé'],
  Tenue: ['Ambré', 'Boisé', 'Résineux', 'Balsamique', 'Musqué'],
  Douceur: ['Gourmand', 'Lacté', 'Poudré', 'Floral'],
}
