export interface PyramidLevel {
  label: string
  duration: string
  ingredients: string
}

export const pyramid: PyramidLevel[] = [
  { label: 'Notes de tête', duration: '0 - 30 min', ingredients: 'Bergamote, Poivre rose, Accord vert' },
  { label: 'Notes de cœur', duration: '30 min - 4 h', ingredients: 'Rose, Jasmin, Pêche' },
  { label: 'Notes de fond', duration: '+ 4 h', ingredients: 'Bois de santal, Ambre, Muscs' },
]

export const olfactiveTags = ['Lumineux', 'Élégant', 'Sensuel', 'Moderne']

export const navItems = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'formulation', label: 'Formulation' },
  { key: 'clients', label: 'Clients' },
  { key: 'materials', label: 'Matières premières' },
  { key: 'accords', label: 'Accords & inspirations' },
  { key: 'regulation', label: 'Réglementation' },
  { key: 'tests', label: 'Tests & stabilité' },
  { key: 'library', label: 'Bibliothèque olfactive' },
  { key: 'export', label: 'Export & documentation' },
  { key: 'team', label: 'Équipe' },
]
