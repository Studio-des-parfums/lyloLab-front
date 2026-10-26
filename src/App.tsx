import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import DashboardPage from './pages/DashboardPage'
import MaterialsLibrary from './pages/MaterialsLibrary'
import FormulaBuilder from './pages/FormulaBuilder'
import ProjectsPage from './pages/ProjectsPage'
import ClientsPage from './pages/ClientsPage'
import { FormulaProvider, useFormula } from './context/FormulaContext'
import './App.css'

type FormulationView = 'list' | 'builder'
type BuilderOrigin = { type: 'formulas' } | { type: 'clientProject'; projectId: string }

function AppContent() {
  const [active, setActive] = useState('dashboard')
  const [formulationView, setFormulationView] = useState<FormulationView>('list')
  const [builderOrigin, setBuilderOrigin] = useState<BuilderOrigin>({ type: 'formulas' })
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const { loadFormula, startNewFormula, setProjectId, duplicateFormula } = useFormula()

  function handleSelect(key: string) {
    if (key === 'formulation') setFormulationView('list')
    if (key !== 'clients') setOpenProjectId(null)
    setActive(key)
  }

  function handleCreateNew() {
    startNewFormula()
    setBuilderOrigin({ type: 'formulas' })
    setFormulationView('builder')
  }

  function handleCreateFormulaForProject(projectId: string) {
    startNewFormula()
    setProjectId(projectId)
    setBuilderOrigin({ type: 'clientProject', projectId })
    setActive('formulation')
    setFormulationView('builder')
  }

  async function handleViewFormula(id: string) {
    await loadFormula(id)
    setBuilderOrigin({ type: 'formulas' })
    setFormulationView('builder')
  }

  function handleBackFromBuilder() {
    if (builderOrigin.type === 'clientProject') {
      setOpenProjectId(builderOrigin.projectId)
      setActive('clients')
    } else {
      setFormulationView('list')
    }
  }

  async function handleGoToFormula(id: string) {
    await loadFormula(id)
    setBuilderOrigin({ type: 'formulas' })
    setActive('formulation')
    setFormulationView('builder')
  }

  async function handleViewFormulaFromProject(id: string, projectId: string) {
    await loadFormula(id)
    setBuilderOrigin({ type: 'clientProject', projectId })
    setActive('formulation')
    setFormulationView('builder')
  }

  function handleCreateNewFromDashboard() {
    handleCreateNew()
    setActive('formulation')
  }

  async function handleOpenFormulaFromDashboard(id: string, projectId: string | null) {
    if (projectId) await handleViewFormulaFromProject(id, projectId)
    else await handleGoToFormula(id)
  }

  function handleOpenProject(projectId: string) {
    setOpenProjectId(projectId)
    setActive('clients')
  }

  async function handleDuplicateFormula(id: string) {
    await duplicateFormula(id)
    setBuilderOrigin({ type: 'formulas' })
    setFormulationView('builder')
  }

  async function handleDuplicateFormulaFromProject(id: string, projectId: string) {
    await duplicateFormula(id)
    setBuilderOrigin({ type: 'clientProject', projectId })
    setActive('formulation')
    setFormulationView('builder')
  }

  function renderContent() {
    switch (active) {
      case 'clients':
        return (
          <ClientsPage
            onViewFormula={handleViewFormulaFromProject}
            onCreateFormula={handleCreateFormulaForProject}
            onDuplicateFormula={handleDuplicateFormulaFromProject}
            openProjectId={openProjectId}
          />
        )
      case 'materials':
        return <MaterialsLibrary onGoToFormula={handleGoToFormula} />
      case 'formulation':
        switch (formulationView) {
          case 'builder':
            return <FormulaBuilder onBack={handleBackFromBuilder} />
          default:
            return (
              <ProjectsPage
                onCreateNew={handleCreateNew}
                onViewFormula={handleViewFormula}
                onDuplicateFormula={handleDuplicateFormula}
              />
            )
        }
      default:
        return (
          <DashboardPage
            onOpenFormula={handleOpenFormulaFromDashboard}
            onOpenProject={handleOpenProject}
            onNewFormula={handleCreateNewFromDashboard}
            onOpenMaterials={() => setActive('materials')}
          />
        )
    }
  }

  return (
    <div className="app-layout">
      <Sidebar active={active} onSelect={handleSelect} />
      <div className="app-main">
        <TopBar />
        {renderContent()}
      </div>
    </div>
  )
}

function App() {
  return (
    <FormulaProvider>
      <AppContent />
    </FormulaProvider>
  )
}

export default App
