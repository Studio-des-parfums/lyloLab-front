import { Save, Copy, Plus } from 'lucide-react'
import { useFormula } from '../context/FormulaContext'
import FormulaNameEditor from '../components/FormulaNameEditor'
import OlfactiveRadar from '../components/OlfactiveRadar'
import OlfactiveRendering from '../components/OlfactiveRendering'
import OlfactivePyramid from '../components/OlfactivePyramid'
import PerfumeBottle from '../components/PerfumeBottle'
import FormulaTable from '../components/FormulaTable'
import QuickAdjustments from '../components/QuickAdjustments'
import FavoriteMaterials from '../components/FavoriteMaterials'
import './FormulaBuilder.css'

export default function FormulaBuilder() {
  const { catalogLoading, catalogError, saveStatus, saveError, saveFormula } =
    useFormula()

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
        </div>
        <div className="dashboard-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={saveFormula}
            disabled={saveStatus === 'saving'}
          >
            <Save size={16} />
            {saveStatus === 'saving' ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button type="button" className="btn btn-outline">
            <Copy size={16} /> Dupliquer
          </button>
          <button type="button" className="btn btn-primary">
            <Plus size={16} /> Nouvelle formule
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="card card-radar">
          <h2 className="card-title">Les 7 facettes de la parfumerie</h2>
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
          <PerfumeBottle />
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
      </div>
    </div>
  )
}
