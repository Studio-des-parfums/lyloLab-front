import type { Facet } from './facetMapping'

export const FACET_DISPLAY: Record<Facet, { emoji: string; color: string }> = {
  Fraîcheur: { emoji: '💧', color: '#5fa8d3' },
  Floralité: { emoji: '🌸', color: '#d6598f' },
  Fruité: { emoji: '🍑', color: '#e08a3c' },
  Gourmande: { emoji: '🍯', color: '#e0b23c' },
  Boisé: { emoji: '🪵', color: '#8a6d3b' },
  Ambré: { emoji: '🟤', color: '#a0622d' },
  Épicé: { emoji: '🌶️', color: '#b5422e' },
}
