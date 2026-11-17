import { useState } from 'react'
import { MessagesSquare, Sparkles, Users } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import FormulaAssistant from './FormulaAssistant'
import FormulaTeamChat from './FormulaTeamChat'
import './FormulaBubble.css'

type Tab = 'ai' | 'team'

/** Bulle de l'éditeur : assistant IA et discussion d'équipe de la formule. */
export default function FormulaBubble() {
  const { isLocked } = useFormula()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('ai')
  // L'assistant modifie la formule : indisponible sur une version finalisée.
  const activeTab: Tab = isLocked ? 'team' : tab

  if (!open) {
    return (
      <button
        type="button"
        className="assistant-launcher"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'assistant et la discussion d'équipe"
        title="Assistant IA et discussion d'équipe"
      >
        {isLocked ? <MessagesSquare size={24} /> : <Sparkles size={24} />}
      </button>
    )
  }

  const tabs = (
    <div className="bubble-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'ai'}
        className={`bubble-tab${activeTab === 'ai' ? ' active' : ''}`}
        onClick={() => setTab('ai')}
        disabled={isLocked}
        title={isLocked ? 'Formule finalisée : l’assistant ne peut plus la modifier' : undefined}
      >
        <Sparkles size={14} /> Assistant IA
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'team'}
        className={`bubble-tab${activeTab === 'team' ? ' active' : ''}`}
        onClick={() => setTab('team')}
      >
        <Users size={14} /> Équipe
      </button>
    </div>
  )

  return (
    <>
      {!isLocked && (
        <FormulaAssistant visible={activeTab === 'ai'} tabs={tabs} onClose={() => setOpen(false)} />
      )}
      <FormulaTeamChat visible={activeTab === 'team'} tabs={tabs} onClose={() => setOpen(false)} />
    </>
  )
}
