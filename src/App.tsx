import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import DashboardPage from './pages/DashboardPage'
import MaterialsLibrary from './pages/MaterialsLibrary'
import FormulaBuilder from './pages/FormulaBuilder'
import ProjectsPage from './pages/ProjectsPage'
import ClientsPage from './pages/ClientsPage'
import RegulationsPage from './pages/RegulationsPage'
import StabilityPage from './pages/StabilityPage'
import LibraryPage from './pages/LibraryPage'
import TeamPage from './pages/TeamPage'
import ApiPage from './pages/ApiPage'
import FormulationRequestsPage from './pages/FormulationRequestsPage'
import FormulaLineagePage from './pages/FormulaLineagePage'
import { countPendingRequests } from './data/formulationRequestsApi'
import AuthPage from './pages/AuthPage'
import UnsavedFormulaModal from './components/UnsavedFormulaModal'
import { FormulaProvider, useFormula } from './context/FormulaContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import './App.css'

type FormulationView = 'list' | 'builder' | 'requests' | 'lineage'
type BuilderOrigin =
  | { type: 'formulas' }
  | { type: 'clientProject'; projectId: string }
  | { type: 'lineage' }

function AppContent() {
  const [active, setActive] = useState('dashboard')
  const [formulationView, setFormulationView] = useState<FormulationView>('list')
  // Page d'une formule (arbre des versions) et d'où on y est arrivé.
  const [lineage, setLineage] = useState<{ formulaId: string; projectId: string | null } | null>(null)
  const [builderOrigin, setBuilderOrigin] = useState<BuilderOrigin>({ type: 'formulas' })
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [openStabilityTestId, setOpenStabilityTestId] = useState<string | null>(null)
  const { loadFormula, startNewFormula, setProjectId, duplicateFormula, hasUnsavedChanges } =
    useFormula()
  // Demandes de formulation en attente : alimente le badge et la cloche.
  const [pendingRequests, setPendingRequests] = useState(0)
  function refreshPendingRequests() {
    countPendingRequests().then(setPendingRequests).catch(() => {})
  }
  useEffect(() => {
    refreshPendingRequests()
    const timer = setInterval(refreshPendingRequests, 30_000)
    return () => clearInterval(timer)
  }, [])

  function openRequests() {
    leaveBuilder(() => {
      setOpenProjectId(null)
      setActive('formulation')
      setFormulationView('requests')
    })
  }

  function handleOpenLineage(formulaId: string, projectId: string | null) {
    setLineage({ formulaId, projectId })
    setActive('formulation')
    setFormulationView('lineage')
  }

  function backFromLineage() {
    if (lineage?.projectId) {
      setOpenProjectId(lineage.projectId)
      setActive('clients')
    } else {
      setFormulationView('list')
    }
  }

  async function handleOpenRequestFormula(formulaId: string, projectId: string | null) {
    if (projectId) await handleViewFormulaFromProject(formulaId, projectId)
    else await handleGoToFormula(formulaId)
  }

  // Navigation held back until the user decides what to do with an unsaved formula.
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)

  const inBuilder = active === 'formulation' && formulationView === 'builder'
  const guardLeave = inBuilder && hasUnsavedChanges

  useEffect(() => {
    if (!guardLeave) return
    // Reload / tab close: browsers only allow their own generic message here.
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [guardLeave])

  function leaveBuilder(action: () => void) {
    if (guardLeave) setPendingLeave(() => action)
    else action()
  }

  function handleSelect(key: string) {
    leaveBuilder(() => selectSection(key))
  }

  function selectSection(key: string) {
    if (key === 'formulation') setFormulationView('list')
    if (key !== 'clients') setOpenProjectId(null)
    setOpenStabilityTestId(null)
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
    leaveBuilder(backFromBuilder)
  }

  function backFromBuilder() {
    if (builderOrigin.type === 'lineage') {
      setFormulationView('lineage')
    } else if (builderOrigin.type === 'clientProject') {
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

  function renderContent() {
    switch (active) {
      case 'clients':
        return (
          <ClientsPage
            onOpenLineage={(id, projectId) => handleOpenLineage(id, projectId)}
            onCreateFormula={handleCreateFormulaForProject}
            openProjectId={openProjectId}
          />
        )
      case 'materials':
        return <MaterialsLibrary onGoToFormula={handleGoToFormula} />
      case 'team':
        return <TeamPage />
      case 'api':
        return <ApiPage />
      case 'regulation':
        return <RegulationsPage />
      case 'tests':
        return <StabilityPage key={openStabilityTestId ?? 'home'} initialTestId={openStabilityTestId} />
      case 'library':
        return <LibraryPage onGoToFormula={handleGoToFormula} />
      case 'formulation':
        switch (formulationView) {
          case 'builder':
            return <FormulaBuilder onBack={handleBackFromBuilder} />
          case 'lineage':
            return lineage ? (
              <FormulaLineagePage
                key={lineage.formulaId}
                formulaId={lineage.formulaId}
                backLabel={lineage.projectId ? 'Retour au projet' : 'Mes projets'}
                onBack={backFromLineage}
                onOpenVersion={async (id) => {
                  await loadFormula(id)
                  setBuilderOrigin({ type: 'lineage' })
                  setFormulationView('builder')
                }}
                onNewVersionFrom={async (id) => {
                  await duplicateFormula(id)
                  setBuilderOrigin({ type: 'lineage' })
                  setFormulationView('builder')
                }}
              />
            ) : null
          case 'requests':
            return (
              <FormulationRequestsPage
                onBack={() => setFormulationView('list')}
                onOpenFormula={handleOpenRequestFormula}
                onChanged={refreshPendingRequests}
              />
            )
          default:
            return (
              <ProjectsPage
                onCreateNew={handleCreateNew}
                onViewFormula={handleViewFormula}
                onOpenLineage={(id) => handleOpenLineage(id, null)}
                pendingRequests={pendingRequests}
                onOpenRequests={openRequests}
              />
            )
        }
      default:
        return (
          <DashboardPage
            onOpenFormula={handleOpenFormulaFromDashboard}
            onOpenLineage={handleOpenLineage}
            onNewFormula={handleCreateNewFromDashboard}
            onOpenMaterials={() => setActive('materials')}
            onOpenStabilityTest={(id) => {
              setOpenStabilityTestId(id)
              setActive('tests')
            }}
            onOpenStability={() => setActive('tests')}
          />
        )
    }
  }

  return (
    <div className="app-layout">
      <Sidebar active={active} onSelect={handleSelect} />
      <div className="app-main">
        <TopBar
          pendingRequests={pendingRequests}
          onOpenRequests={openRequests}
          onOpenFormula={(id, projectId) =>
            leaveBuilder(() => {
              void handleOpenFormulaFromDashboard(id, projectId)
            })
          }
        />
        {renderContent()}
      </div>
      {pendingLeave && (
        <UnsavedFormulaModal
          onLeave={() => {
            pendingLeave()
            setPendingLeave(null)
          }}
          onCancel={() => setPendingLeave(null)}
        />
      )}
    </div>
  )
}

function SignedInApp() {
  const { user, checking } = useAuth()

  if (checking) return <div className="app-splash">Chargement...</div>
  if (!user) return <AuthPage />

  // Keyed by user so signing in as someone else starts from a clean state.
  return (
    <FormulaProvider key={user.id}>
      <AppContent />
    </FormulaProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <SignedInApp />
    </AuthProvider>
  )
}

export default App
