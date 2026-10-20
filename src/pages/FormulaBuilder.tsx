import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import FormulaNameEditor from '../components/FormulaNameEditor'
import OlfactiveRadar from '../components/OlfactiveRadar'
import OlfactiveRendering from '../components/OlfactiveRendering'
import OlfactivePyramid from '../components/OlfactivePyramid'
import FormulaTable from '../components/FormulaTable'
import ComplianceReport from '../components/ComplianceReport'
import QuickAdjustments from '../components/QuickAdjustments'
import FavoriteMaterials from '../components/FavoriteMaterials'
import './FormulaBuilder.css'

interface FormulaBuilderProps {
  onBack: () => void
}

export default function FormulaBuilder({ onBack }: FormulaBuilderProps) {
  const {
    catalogLoading,
    catalogError,
    saveStatus,
    saveError,
    saveFormula,
    formulaStatus,
    finalizeStatus,
    finalizeError,
    finalizeCurrentFormula,
  } = useFormula()

  if (catalogLoading) {
    return (
      <div className="dashboard">
        <p className="dashboard-status">Chargement des matières premières...</p>
      </div>
    )
  }

  if (catalogError) {
    return (
      <div className="dashboard">
        <p className="dashboard-status dashboard-status-error">
          Impossible de charger les matières premières : {catalogError}.
          Vérifiez que le serveur backend est démarré.
        </p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <button type="button" className="btn btn-outline dashboard-back" onClick={onBack}>
            <ArrowLeft size={16} /> Retour
          </button>
          <FormulaNameEditor />
          {saveStatus === 'success' && (
            <p className="dashboard-save-status dashboard-save-success">
              Formule enregistrée avec succès.
            </p>
          )}
          {saveStatus === 'error' && (
            <p className="dashboard-save-status dashboard-save-error">
              {saveError}
            </p>
          )}
          {finalizeStatus === 'success' && formulaStatus === 'completed' && (
            <p className="dashboard-save-status dashboard-save-success">
              Formule finalisée.
            </p>
          )}
          {finalizeStatus === 'error' && (
            <p className="dashboard-save-status dashboard-save-error">
              {finalizeError}
            </p>
          )}
        </div>
        <div className="dashboard-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={saveFormula}
            disabled={saveStatus === 'saving'}
          >
            <Save size={16} />
            {saveStatus === 'saving' ? 'Enregistrement...' : 'Enregistrer le brouillon'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={finalizeCurrentFormula}
            disabled={finalizeStatus === 'saving' || formulaStatus === 'completed'}
          >
            <CheckCircle2 size={16} />
            {formulaStatus === 'completed' ? 'Formule finalisée' : 'Finaliser'}
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="card card-radar card-wide">
          <h2 className="card-title">Les 24 facettes de la parfumerie</h2>
          <p className="card-subtitle">
            Ajustez les curseurs pour définir la personnalité olfactive de votre création.
          </p>
          <OlfactiveRadar />
        </section>

        <section className="card-stack">
          <div className="card">
            <OlfactiveRendering />
          </div>
          <div className="card">
            <QuickAdjustments />
          </div>
        </section>

        <section className="card">
          <FormulaTable />
        </section>

        <section className="card">
          <OlfactivePyramid />
        </section>

        <section className="card card-wide">
          <FavoriteMaterials />
        </section>

        <section className="card card-wide">
          <ComplianceReport />
        </section>
      </div>
    </div>
  )
}
