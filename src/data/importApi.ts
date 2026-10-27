import { API_URL, apiFetch, readErrorMessage } from './api'

/** Columns the import understands (backend/src/materials/import/import-format.ts). */
export interface ImportField {
  key: string
  label: string
  required?: boolean
  aliases: string[]
  hint?: string
}

export interface ImportFormat {
  fields: ImportField[]
  facets: string[]
  descriptorMax: number
  acceptedExtensions: string[]
  maxSizeMb: number
}

export interface ImportReport {
  fileName: string
  applied: boolean
  sheets: {
    name: string
    headerRow: number | null
    columns: { header: string; label: string | null }[]
    materialRows: number
    skippedReason?: string
  }[]
  summary: { total: number; create: number; update: number; withWarnings: number; stocks: number }
  rows: {
    ref: string
    name: string
    action: 'create' | 'update'
    fields: string[]
    warnings: string[]
  }[]
  errors: { ref: string; message: string }[]
}

export async function fetchImportFormat(): Promise<ImportFormat> {
  const res = await apiFetch(`${API_URL}/api/materials/import/format`)
  if (!res.ok) throw new Error(await readErrorMessage(res, "Impossible de charger le format d'import"))
  return res.json()
}

/** Without `apply`, only reads the file and reports what would happen. */
export async function importMaterials(file: File, apply: boolean): Promise<ImportReport> {
  const body = new FormData()
  body.append('file', file)
  const res = await apiFetch(`${API_URL}/api/materials/import${apply ? '?apply=true' : ''}`, {
    method: 'POST',
    body,
  })
  if (res.status === 413) throw new Error('Fichier trop volumineux.')
  if (!res.ok) throw new Error(await readErrorMessage(res, "L'import a échoué"))
  return res.json()
}

/** CSV template with every recognised column and one example row. */
export function importTemplate(format: ImportFormat): Blob {
  const example: Record<string, string> = {
    name: 'Linalol',
    casNumber: '78-70-6',
    family: 'Floral',
    nature: 'Synthétique',
    sensation: 'Frais, floral, boisé, légèrement citronné',
    subjectivePower: '3',
    ifraLimit: 'Aucune limite',
    allergens: 'Linalool',
    supplier: 'MPE',
    producer: 'Givaudan',
    location: 'A1',
    stock: '250',
    adjacentNote: 'Bois de rose',
    regulation: 'Allergène déclarable',
    freeNote: 'Antioxydant obligatoire',
    visualAspect: 'Liquide incolore',
    flashPoint: '78 °C',
    physicochemicalState: 'Liquide',
    waterBase: 'Non',
  }
  const exampleFacets: Record<string, string> = { Floral: '7', Fraicheur: '5', Boisé: '3' }
  const headers = [...format.fields.map((f) => f.label), ...format.facets]
  const values = [
    ...format.fields.map((f) => example[f.key] ?? ''),
    ...format.facets.map((facet) => exampleFacets[facet] ?? ''),
  ]
  const line = (cells: string[]) =>
    cells.map((cell) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(';')
  // BOM so Excel opens the accents correctly.
  return new Blob([`﻿${line(headers)}\r\n${line(values)}\r\n`], { type: 'text/csv;charset=utf-8' })
}
