import { API_URL, apiFetch } from './api'

export interface DashboardKpis {
  draftFormulas: number
  completedFormulas: number
  formulasThisMonth: number
  activeProjects: number
  clients: number
  materials: number
  outOfStockMaterials: number
}

export interface DashboardDeadline {
  projectId: string
  projectName: string
  clientName: string
  endDate: string
  /** Negative when the project is overdue. */
  daysLeft: number
  draftCount: number
  completedCount: number
}

export interface DashboardDraft {
  id: string
  name: string
  createdAt: string
  materialCount: number
  /** Null for drafts created before authors were tracked. */
  author: string | null
  projectId: string | null
  projectName: string | null
  clientName: string | null
}

export type StockAlertLevel = 'out' | 'low' | 'missing'

export interface DashboardStockAlert {
  materialId: string
  name: string
  level: StockAlertLevel
  stockGrams: number | null
  locations: string[]
  suppliers: string[]
  formulaCount: number
}

export interface DashboardTopMaterial {
  materialId: string
  name: string
  formulaCount: number
  averagePercent: number
}

export interface DashboardRegulatoryItem {
  formulaId: string
  name: string
  status: 'draft' | 'completed'
  projectId: string | null
  projectName: string | null
  clientName: string | null
  level: 'violation' | 'warning'
  banned: string[]
  exceeded: string[]
  capped: string[]
  overlappingAllergens: string[]
}

export interface DashboardOverview {
  kpis: DashboardKpis
  deadlines: DashboardDeadline[]
  recentDrafts: DashboardDraft[]
  stockAlerts: DashboardStockAlert[]
  stockAlertTotal: number
  lowStockGrams: number
  topMaterials: DashboardTopMaterial[]
  regulatory: DashboardRegulatoryItem[]
  regulatoryTotal: number
}

export async function fetchDashboard(): Promise<DashboardOverview> {
  const res = await apiFetch(`${API_URL}/api/dashboard`)
  if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`)
  return res.json()
}
