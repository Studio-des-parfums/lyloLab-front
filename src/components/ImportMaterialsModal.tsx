import { useEffect, useRef, useState, type DragEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Upload,
  X,
} from 'lucide-react'
import {
  fetchImportFormat,
  importMaterials,
  importTemplate,
  type ImportFormat,
  type ImportReport,
} from '../data/importApi'
import './ImportMaterialsModal.css'

interface ImportMaterialsModalProps {
  onClose: () => void
  /** Called after materials were written, so the catalog can be reloaded. */
  onImported: () => void
}

type Step = 'choose' | 'preview' | 'done'

const PREVIEW_ROWS = 200

export default function ImportMaterialsModal({ onClose, onImported }: ImportMaterialsModalProps) {
  const [format, setFormat] = useState<ImportFormat | null>(null)
  const [step, setStep] = useState<Step>('choose')
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchImportFormat()
      .then(setFormat)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function preview(chosen: File) {
    setFile(chosen)
    setBusy(true)
    setError(null)
    try {
      setReport(await importMaterials(chosen, false))
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setReport(await importMaterials(file, true))
      setStep('done')
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  function downloadTemplate() {
    if (!format) return
    const url = URL.createObjectURL(importTemplate(format))
    const link = document.createElement('a')
    link.href = url
    link.download = 'modele-import-matieres.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && !busy) preview(dropped)
  }

  return (
    <div className="import-overlay" onClick={() => !busy && onClose()}>
      <div
        className="import-modal"
        role="dialog"
        aria-label="Importer des matières premières"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="import-header">
          <h2>
            <FileSpreadsheet size={18} /> Importer des matières premières
          </h2>
          <button type="button" className="import-close" onClick={onClose} disabled={busy} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="import-body">
          {step === 'choose' && (
            <>
              <div
                className={dragging ? 'import-drop import-drop-active' : 'import-drop'}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <Upload size={22} />
                <p>
                  {busy ? `Lecture de « ${file?.name} »…` : 'Glissez un fichier ici ou'}
                </p>
                {!busy && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => inputRef.current?.click()}
                    disabled={!format}
                  >
                    Choisir un fichier
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  accept={format?.acceptedExtensions.join(',')}
                  onChange={(e) => {
                    const chosen = e.target.files?.[0]
                    e.target.value = ''
                    if (chosen) preview(chosen)
                  }}
                />
                {format && (
                  <span className="import-drop-formats">
                    Excel ({'.xlsx'}), CSV ou texte ({'.csv, .tsv, .txt'}), JSON · {format.maxSizeMb} Mo max.
                  </span>
                )}
              </div>

              {format && <ImportGuide format={format} onDownloadTemplate={downloadTemplate} />}
            </>
          )}

          {step !== 'choose' && report && <ImportReportView report={report} />}

          {error && <p className="import-error">{error}</p>}
        </div>

        <div className="import-footer">
          {step === 'preview' && report && (
            <>
              <button type="button" className="btn btn-outline" onClick={() => setStep('choose')} disabled={busy}>
                Changer de fichier
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={apply}
                disabled={busy || report.summary.total === 0}
              >
                {busy
                  ? 'Import en cours…'
                  : `Importer ${report.summary.total} matière${report.summary.total > 1 ? 's' : ''}`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** What the file must contain, shown as soon as the import is opened. */
function ImportGuide({
  format,
  onDownloadTemplate,
}: {
  format: ImportFormat
  onDownloadTemplate: () => void
}) {
  return (
    <section className="import-guide">
      <div className="import-guide-head">
        <h3>
          <Info size={15} /> Informations attendues
        </h3>
        <button type="button" className="import-link" onClick={onDownloadTemplate}>
          <Download size={14} /> Télécharger un modèle (CSV)
        </button>
      </div>
      <ul className="import-rules">
        <li>Une ligne par matière première ; la première ligne donne le nom des colonnes.</li>
        <li>Seule la colonne <strong>Nom</strong> est obligatoire : remplissez les autres quand vous les connaissez.</li>
        <li>
          Une matière déjà présente sous le même nom est <strong>mise à jour</strong> ; une case vide
          n'efface jamais une information existante.
        </li>
        <li>Dans un fichier Excel, tous les onglets qui ont une colonne « Nom » sont lus.</li>
        <li>Les colonnes non reconnues sont ignorées et signalées dans l'aperçu.</li>
      </ul>

      <table className="import-fields">
        <thead>
          <tr>
            <th>Information</th>
            <th>Noms de colonne acceptés</th>
            <th>Format</th>
          </tr>
        </thead>
        <tbody>
          {format.fields.map((field) => (
            <tr key={field.key}>
              <td>
                {field.label}
                {field.required && <span className="import-required">obligatoire</span>}
              </td>
              <td className="import-aliases">{field.aliases.join(', ')}</td>
              <td className="import-hint">{field.hint ?? 'texte'}</td>
            </tr>
          ))}
          <tr>
            <td>Facettes olfactives</td>
            <td className="import-aliases">
              Une colonne par facette, au nom de la facette : {format.facets.join(', ')}
            </td>
            <td className="import-hint">note de 0 à {format.descriptorMax}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function ImportReportView({ report }: { report: ImportReport }) {
  const { summary } = report
  const shown = report.rows.slice(0, PREVIEW_ROWS)

  return (
    <div className="import-report">
      {report.applied ? (
        <p className="import-done">
          <CheckCircle2 size={18} /> Import terminé : {summary.create} matière
          {summary.create > 1 ? 's' : ''} créée{summary.create > 1 ? 's' : ''}, {summary.update} mise
          {summary.update > 1 ? 's' : ''} à jour.
        </p>
      ) : (
        <p className="import-file">
          <FileSpreadsheet size={15} /> {report.fileName}
        </p>
      )}

      <div className="import-summary">
        <span className="import-chip">
          <strong>{summary.total}</strong> matières trouvées
        </span>
        <span className="import-chip import-chip-create">
          <strong>{summary.create}</strong> nouvelles
        </span>
        <span className="import-chip import-chip-update">
          <strong>{summary.update}</strong> mises à jour
        </span>
        {summary.stocks > 0 && (
          <span className="import-chip">
            <strong>{summary.stocks}</strong> lignes de stock
          </span>
        )}
        {summary.withWarnings > 0 && (
          <span className="import-chip import-chip-warning">
            <AlertTriangle size={12} /> <strong>{summary.withWarnings}</strong> avec avertissement
          </span>
        )}
      </div>

      {report.sheets.map((sheet) => (
        <div key={sheet.name} className="import-sheet">
          <p className="import-sheet-name">
            {sheet.name}
            {sheet.headerRow && ` · en-têtes ligne ${sheet.headerRow} · ${sheet.materialRows} lignes`}
          </p>
          {sheet.skippedReason ? (
            <p className="import-sheet-skipped">Onglet ignoré : {sheet.skippedReason}</p>
          ) : (
            <div className="import-columns">
              {sheet.columns.map((column, i) => (
                <span
                  key={`${column.header}-${i}`}
                  className={column.label ? 'import-column' : 'import-column import-column-ignored'}
                  title={column.label ? `Lue comme : ${column.label}` : 'Colonne non reconnue, ignorée'}
                >
                  {column.header}
                  {column.label && column.label !== column.header && ` → ${column.label}`}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {report.errors.length > 0 && (
        <div className="import-errors">
          {report.errors.map((e, i) => (
            <p key={i}>
              <AlertTriangle size={12} /> {e.ref} : {e.message}
            </p>
          ))}
        </div>
      )}

      {shown.length > 0 && (
        <table className="import-rows">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Action</th>
              <th>Informations lues</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={`${row.ref}-${row.name}`}>
                <td>
                  <span className="import-row-name">{row.name}</span>
                  <span className="import-row-ref">{row.ref}</span>
                </td>
                <td>
                  <span className={`import-action import-action-${row.action}`}>
                    {row.action === 'create' ? 'Nouvelle' : 'Mise à jour'}
                  </span>
                </td>
                <td>
                  {row.fields.join(', ') || '—'}
                  {row.warnings.map((warning) => (
                    <span key={warning} className="import-row-warning">
                      <AlertTriangle size={11} /> {warning}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {report.rows.length > shown.length && (
        <p className="import-more">
          … et {report.rows.length - shown.length} autres matières (toutes seront importées).
        </p>
      )}
    </div>
  )
}
