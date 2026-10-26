export interface ProjectFormulaSummary {
  id: string
  name: string
  status: 'draft' | 'completed'
  createdAt: string
  materializedAs: { id: string } | null
}

export interface Project {
  id: string
  name: string
  clientId: string
  description: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
}

export interface ProjectDetail extends Project {
  client: Client
  formulas: ProjectFormulaSummary[]
}

export interface Client {
  id: string
  company: string | null
  contactFirstName: string | null
  contactLastName: string | null
  contactEmail: string | null
  contactPhone: string | null
  createdAt: string
  projects: Project[]
}

export function getClientDisplayName(client: Pick<Client, 'company' | 'contactFirstName' | 'contactLastName'>): string {
  if (client.company) return client.company
  const contactName = `${client.contactFirstName ?? ''} ${client.contactLastName ?? ''}`.trim()
  return contactName || 'Client sans nom'
}

export interface UpdateClientPayload {
  company?: string
  contactFirstName?: string
  contactLastName?: string
  contactEmail?: string
  contactPhone?: string
}

export interface UpdateProjectPayload {
  name?: string
  description?: string
  startDate?: string | null
  endDate?: string | null
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function listClients(): Promise<Client[]> {
  const res = await fetch(`${API_URL}/api/clients`)
  if (!res.ok) throw new Error(`Failed to load clients (${res.status})`)
  return res.json()
}

export async function getClient(id: string): Promise<Client> {
  const res = await fetch(`${API_URL}/api/clients/${id}`)
  if (!res.ok) throw new Error(`Failed to load client (${res.status})`)
  return res.json()
}

export interface CreateClientPayload {
  company?: string
  contactFirstName?: string
  contactLastName?: string
  contactEmail?: string
  contactPhone?: string
}

export async function createClient(payload: CreateClientPayload): Promise<Client> {
  const res = await fetch(`${API_URL}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to create client (${res.status})`)
  }
  return res.json()
}

export async function updateClient(id: string, payload: UpdateClientPayload): Promise<Client> {
  const res = await fetch(`${API_URL}/api/clients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to update client (${res.status})`)
  }
  return res.json()
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const res = await fetch(`${API_URL}/api/projects/${id}`)
  if (!res.ok) throw new Error(`Failed to load project (${res.status})`)
  return res.json()
}

export interface CreateProjectPayload {
  name: string
  clientId: string
  description?: string
  startDate?: string
  endDate?: string
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to create project (${res.status})`)
  }
  return res.json()
}

export async function updateProject(
  id: string,
  payload: UpdateProjectPayload,
): Promise<ProjectDetail> {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to update project (${res.status})`)
  }
  return res.json()
}
