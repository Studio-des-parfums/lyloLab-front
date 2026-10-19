import { useRef, useState } from 'react'
import { Pencil, Check } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import './FormulaNameEditor.css'

export default function FormulaNameEditor() {
  const { formulaName, setFormulaName } = useFormula()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(formulaName)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setDraft(formulaName)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed.length > 0) setFormulaName(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="formula-name-editor">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          onBlur={commit}
          className="formula-name-input"
        />
        <button type="button" className="formula-name-confirm" onClick={commit}>
          <Check size={16} />
        </button>
      </div>
    )
  }

  return (
    <h1 className="dashboard-title">
      {formulaName}{' '}
      <button
        type="button"
        className="edit-icon"
        onClick={startEditing}
        aria-label="Modifier le nom de la formule"
      >
        <Pencil size={16} />
      </button>
    </h1>
  )
}
