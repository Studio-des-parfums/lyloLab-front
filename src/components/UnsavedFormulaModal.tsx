import { AlertTriangle, Save, Trash2 } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import './UnsavedFormulaModal.css'

interface UnsavedFormulaModalProps {
  /** Called once the user chose to leave (after a successful save, or discarding). */
  onLeave: () => void
  onCancel: () => void
}

export default function UnsavedFormulaModal({ onLeave, onCancel }: UnsavedFormulaModalProps) {
  const { saveFormula, saveStatus, saveError } = useFormula()
  const saving = saveStatus === 'saving'

  async function handleSave() {
    if (await saveFormula()) onLeave()
  }

  return (
    <div className="unsaved-overlay" onClick={() => !saving && onCancel()}>
      <div
        className="unsaved-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="unsaved-title">
          <AlertTriangle size={18} /> Formule non enregistrée
        </h2>
        <p>
          Si vous quittez cette page, votre formule sera perdue. Enregistrez-la comme brouillon
          pour la sauvegarder.
        </p>
        {saveStatus === 'error' && saveError && <p className="unsaved-error">{saveError}</p>}
        <div className="unsaved-actions">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? 'Enregistrement...' : 'Enregistrer comme brouillon'}
          </button>
          <button type="button" className="btn btn-outline unsaved-discard" onClick={onLeave} disabled={saving}>
            <Trash2 size={16} /> Quitter sans enregistrer
          </button>
          <button type="button" className="unsaved-cancel" onClick={onCancel} disabled={saving}>
            Rester sur la formule
          </button>
        </div>
      </div>
    </div>
  )
}
