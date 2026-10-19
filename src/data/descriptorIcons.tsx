import {
  Droplet,
  Flower2,
  Cherry,
  TreeDeciduous,
  Flame,
  Waves,
  CircleDot,
  Sparkles,
  Milk,
  Leaf,
  Mountain,
  Citrus,
  Wind,
  Candy,
  Snowflake,
  Dog,
  Trees,
  Sprout,
  Feather,
  Soup,
  Bird,
  Wheat,
  type LucideIcon,
} from 'lucide-react'

interface DescriptorDisplay {
  icon: LucideIcon
  color: string
}

export const DESCRIPTOR_DISPLAY: Record<string, DescriptorDisplay> = {
  Sec: { icon: Wind, color: '#8a8373' },
  Gras: { icon: Droplet, color: '#c9a24a' },
  Vert: { icon: Leaf, color: '#5a9e5f' },
  Fumé: { icon: Flame, color: '#6b5c54' },
  Marin: { icon: Waves, color: '#5fa8d3' },
  Ambré: { icon: CircleDot, color: '#a0622d' },
  Boisé: { icon: TreeDeciduous, color: '#8a6d3b' },
  Epicé: { icon: Flame, color: '#b5422e' },
  Floral: { icon: Flower2, color: '#d6598f' },
  Lacté: { icon: Milk, color: '#e3c9a0' },
  Chypré: { icon: Trees, color: '#6f7d4f' },
  Fruité: { icon: Cherry, color: '#e08a3c' },
  Musqué: { icon: Dog, color: '#9b8c7a' },
  Poudré: { icon: Feather, color: '#cbb3c9' },
  Terreux: { icon: Mountain, color: '#7a5c3e' },
  Acidulé: { icon: Citrus, color: '#d9c22e' },
  Camphré: { icon: Snowflake, color: '#6fb7b0' },
  Gourmand: { icon: Candy, color: '#e0b23c' },
  Fraicheur: { icon: Wheat, color: '#7fc2c9' },
  Résineux: { icon: Sprout, color: '#5f7a3d' },
  Aldéhydé: { icon: Sparkles, color: '#b8b8d9' },
  Animalisé: { icon: Bird, color: '#8a5a3c' },
  Aromatique: { icon: Soup, color: '#6a8f5c' },
  Balsamique: { icon: Sprout, color: '#8a6a4a' },
}

const DEFAULT_DISPLAY: DescriptorDisplay = { icon: CircleDot, color: '#8a8373' }

export function displayForDescriptor(descriptor: string): DescriptorDisplay {
  return DESCRIPTOR_DISPLAY[descriptor] ?? DEFAULT_DISPLAY
}

export function iconForDescriptor(descriptor: string): LucideIcon {
  return displayForDescriptor(descriptor).icon
}

export function colorForDescriptor(descriptor: string): string {
  return displayForDescriptor(descriptor).color
}

export function dominantDescriptor(
  descriptors: Record<string, number>,
): string | null {
  const entries = Object.entries(descriptors).filter(([, value]) => value > 0)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}
