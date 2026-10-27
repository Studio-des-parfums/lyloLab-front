import { ArrowLeft, Save, CheckCircle2, FlaskConical, Copy, Lock } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import FormulaNameEditor from '../components/FormulaNameEditor'
import FormulaVolumeInput from '../components/FormulaVolumeInput'
import ClientProjectPicker from '../components/ClientProjectPicker'
import OlfactiveRadar from '../components/OlfactiveRadar'
import OlfactiveRendering from '../components/OlfactiveRendering'
import OlfactivePyramid from '../components/OlfactivePyramid'
import FormulaTable from '../components/FormulaTable'
import ComplianceReport from '../components/ComplianceReport'
import QuickAdjustments from '../components/QuickAdjustments'
import FavoriteMaterials from '../components/FavoriteMaterials'
import FormulaAssistant from '../components/FormulaAssistant'
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
    formulaId,
    formulaOrigin,
    formulaStatus,
    isLocked,
    finalizeStatus,
    finalizeError,
    finalizeCurrentFormula,
    convertStatus,
    convertError,
    convertCurrentFormulaToMaterial,
    duplicateFormula,
    loadStatus,
    projectId,
  } = useFormula()
  const isClientProjectFormula = projectId !== null

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
          {formulaOrigin && (
            <p className="dashboard-origin">
              Créée{formulaOrigin.author ? ` par ${formulaOrigin.author}` : ''} le{' '}
              {new Date(formulaOrigin.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
          <div className="builder-settings">
            <ClientProjectPicker />
            <FormulaVolumeInput />
          </div>
          {isLocked && (
            <p className="dashboard-locked-banner">
              <Lock size={14} /> Formule finalisée : elle n'est plus modifiable. Dupliquez-la pour
              créer une nouvelle version.
            </p>
          )}
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
          {convertStatus === 'success' && (
            <p className="dashboard-save-status dashboard-save-success">
              Formule transformée en matière première synthétique.
            </p>
          )}
          {convertStatus === 'error' && (
            <p className="dashboard-save-status dashboard-save-error">
              {convertError}
            </p>
          )}
        </div>
        <div className="dashboard-actions">
          {!isLocked && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={saveFormula}
              disabled={saveStatus === 'saving'}
            >
              <Save size={16} />
              {saveStatus === 'saving' ? 'Enregistrement...' : 'Enregistrer le brouillon'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline"
            onClick={finalizeCurrentFormula}
            disabled={finalizeStatus === 'saving' || isLocked}
          >
            <CheckCircle2 size={16} />
            {isLocked ? 'Formule finalisée' : 'Finaliser'}
          </button>
          {!isClientProjectFormula && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={convertCurrentFormulaToMaterial}
              disabled={convertStatus === 'saving'}
            >
              <FlaskConical size={16} />
              {convertStatus === 'saving'
                ? 'Transformation...'
                : 'Transformer en matière première'}
            </button>
          )}
          {formulaId && (!isClientProjectFormula || isLocked) && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => duplicateFormula(formulaId)}
              disabled={loadStatus === 'saving'}
            >
              <Copy size={16} /> Dupliquer en nouvelle version
            </button>
          )}
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

      {!isLocked && <FormulaAssistant />}
    </div>
  )
}
