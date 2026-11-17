import { useEffect, useRef, useState } from 'react'
import { Check, FileText, Pencil, X } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import './FormulaDescriptionEditor.css'

/**
 * Résultat visé : défini une fois pour toute la formule.
 * Il se saisit à la création ; ensuite il se modifie depuis la liste des formules (fenêtre « Versions »).
 * Dans une version enregistrée, il sert de rappel en lecture seule.
 */
export default function FormulaDescriptionEditor() {
  const { formulaDescription, setFormulaDescription, formulaId } = useFormula()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(formulaDescription)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  // Version déjà enregistrée : simple rappel du but à atteindre.
  if (formulaId) {
    if (!formulaDescription) return null
    return (
      <div className="formula-description" title="Commun à toutes les versions. Modifiable depuis la liste des formules (Versions).">
        <span className="formula-description-label">Résultat visé (toutes versions)</span>
        <p>{formulaDescription}</p>
      </div>
    )
  }

  function commit() {
    setFormulaDescription(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="formula-description-edit">
        <textarea
          ref={ref}
          rows={4}
          maxLength={5000}
          placeholder="À quoi doit ressembler la version finale : intention olfactive, ambiance, contraintes..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false)
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
          }}
        />
        <div className="formula-description-actions">
          <button type="button" className="btn btn-outline" onClick={commit}>
            <Check size={14} /> Valider
          </button>
          <button type="button" className="formula-description-cancel" onClick={() => setEditing(false)} aria-label="Annuler">
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  if (!formulaDescription) {
    return (
      <button
        type="button"
        className="formula-description-add"
        onClick={() => {
          setDraft('')
          setEditing(true)
        }}
      >
        <FileText size={14} /> Décrire le résultat visé
      </button>
    )
  }

  return (
    <div className="formula-description">
      <span className="formula-description-label">Résultat visé</span>
      <p>{formulaDescription}</p>
      <button
        type="button"
        className="formula-description-pencil"
        onClick={() => {
          setDraft(formulaDescription)
          setEditing(true)
        }}
        aria-label="Modifier le résultat visé"
      >
        <Pencil size={14} />
      </button>
    </div>
  )
}
